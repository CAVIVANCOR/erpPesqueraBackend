import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import kardexService from './kardexAlmacen.service.js';

/**
 * Servicio CRUD para MovimientoAlmacen
 * Aplica validaciones de existencia de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del movimiento
 * @param {BigInt} [id] - ID del registro a excluir (para update)
 */
async function validarForaneas(data) {
  // Validar tipoDocumentoId
  if (data.tipoDocumentoId !== undefined && data.tipoDocumentoId !== null) {
    const tipoDoc = await prisma.tipoDocumento.findUnique({ where: { id: data.tipoDocumentoId } });
    if (!tipoDoc) throw new ValidationError('El tipo de documento referenciado no existe.');
  }
  // Validar conceptoMovAlmacenId
  if (data.conceptoMovAlmacenId !== undefined && data.conceptoMovAlmacenId !== null) {
    const concepto = await prisma.conceptoMovAlmacen.findUnique({ where: { id: data.conceptoMovAlmacenId } });
    if (!concepto) throw new ValidationError('El concepto de movimiento de almacén referenciado no existe.');
  }
  // Validar serieDocId (opcional)
  if (data.serieDocId !== undefined && data.serieDocId !== null) {
    const serie = await prisma.serieDoc.findUnique({ where: { id: data.serieDocId } });
    if (!serie) throw new ValidationError('La serie de documento referenciada no existe.');
  }
  // Validar entidadComercialId (opcional)
  if (data.entidadComercialId !== undefined && data.entidadComercialId !== null) {
    const entidad = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!entidad) throw new ValidationError('La entidad comercial referenciada no existe.');
  }
}

/**
 * Lista todos los movimientos de almacén.
 */
const listar = async () => {
  try {
    return await prisma.movimientoAlmacen.findMany({ 
      include: { 
        empresa: true,
        tipoDocumento: true,
        conceptoMovAlmacen: true,
        entidadComercial: true,
        detalles: true, 
        preFacturasSalida: true 
      } 
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un movimiento por ID (incluyendo detalles y prefacturas asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const mov = await prisma.movimientoAlmacen.findUnique({ 
      where: { id }, 
      include: { 
        empresa: true,
        tipoDocumento: true,
        conceptoMovAlmacen: true,
        serieDoc: true,
        entidadComercial: true,
        detalles: {
          include: {
            producto: {
              include: {
                unidadMedida: true,
                marca: true,
                familia: true,
                subfamilia: true,
                tipoMaterial: true,
                color: true,
                tipoAlmacenamiento: true
              }
            }
          }
        },
        preFacturasSalida: true 
      } 
    });
    if (!mov) throw new NotFoundError('MovimientoAlmacen no encontrado');
    
    // Cargar manualmente los almacenes origen y destino del concepto
    if (mov.conceptoMovAlmacen) {

      
      if (mov.conceptoMovAlmacen.almacenOrigenId) {
        mov.conceptoMovAlmacen.almacenOrigen = await prisma.almacen.findUnique({
          where: { id: mov.conceptoMovAlmacen.almacenOrigenId }
        });
      }
      if (mov.conceptoMovAlmacen.almacenDestinoId) {
        mov.conceptoMovAlmacen.almacenDestino = await prisma.almacen.findUnique({
          where: { id: mov.conceptoMovAlmacen.almacenDestinoId }
        });
      }
    }
    
    // Cargar manualmente el personal responsable de almacén
    if (mov.personalRespAlmacen) {
      const personalId = mov.personalRespAlmacen; // Es un BigInt con el ID
      
      const personal = await prisma.personal.findUnique({
        where: { id: personalId }
      });
      
      mov.personalRespAlmacen = personal; // Reemplazar el ID con el objeto completo
    }
    
    // Cargar manualmente los estados de mercadería y calidad para cada detalle
    if (mov.detalles && mov.detalles.length > 0) {
      const estadoMercaderiaIds = [...new Set(mov.detalles.map(d => d.estadoMercaderiaId).filter(Boolean))];
      const estadoCalidadIds = [...new Set(mov.detalles.map(d => d.estadoCalidadId).filter(Boolean))];
      
      const estadosMercaderia = estadoMercaderiaIds.length > 0 
        ? await prisma.estadoMultiFuncion.findMany({ where: { id: { in: estadoMercaderiaIds } } })
        : [];
      
      const estadosCalidad = estadoCalidadIds.length > 0
        ? await prisma.estadoMultiFuncion.findMany({ where: { id: { in: estadoCalidadIds } } })
        : [];
      
      // Mapear estados a los detalles
      mov.detalles = mov.detalles.map(detalle => ({
        ...detalle,
        estadoMercaderia: detalle.estadoMercaderiaId 
          ? estadosMercaderia.find(e => e.id === detalle.estadoMercaderiaId) 
          : null,
        estadoCalidad: detalle.estadoCalidadId
          ? estadosCalidad.find(e => e.id === detalle.estadoCalidadId)
          : null
      }));
    }
    
    return mov;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un movimiento de almacén en estado PENDIENTE (30).
 */
const crear = async (data) => {
  try {
    
    if (!data.empresaId || !data.tipoDocumentoId || !data.conceptoMovAlmacenId || !data.fechaDocumento) {
      throw new ValidationError('Los campos empresaId, tipoDocumentoId, conceptoMovAlmacenId y fechaDocumento son obligatorios.');
    }
    if (!data.serieDocId) {
      throw new ValidationError('El campo serieDocId es obligatorio.');
    }
    await validarForaneas(data);
    
    // Usar transacción para generar número y actualizar correlativo atómicamente
    return await prisma.$transaction(async (tx) => {
      // 1. Obtener la serie seleccionada
      const serie = await tx.serieDoc.findUnique({
        where: { id: BigInt(data.serieDocId) }
      });
      
      if (!serie) {
        throw new ValidationError('Serie de documento no encontrada.');
      }
      
      // 2. Calcular nuevo correlativo
      const nuevoCorrelativo = Number(serie.correlativo) + 1;
      
      // 3. Generar números con formato
      const numSerie = String(serie.serie).padStart(serie.numCerosIzqSerie, '0');
      const numCorre = String(nuevoCorrelativo).padStart(serie.numCerosIzqCorre, '0');
      const numeroDocumento = `${numSerie}-${numCorre}`;
      
      // 4. Extraer detalles del data
      const { detalles, ...dataMovimiento } = data;
      
      // 5. Preparar data con números generados y estado PENDIENTE (30)
      const dataConEstado = {
        ...dataMovimiento,
        numSerieDoc: numSerie,
        numCorreDoc: numCorre,
        numeroDocumento: numeroDocumento,
        estadoDocAlmacenId: BigInt(30),
        actualizadoEn: new Date()
      };
      
      // 6. Si hay detalles, agregarlos con la sintaxis correcta de Prisma
      if (detalles && detalles.length > 0) {
        dataConEstado.detalles = {
          create: detalles.map(detalle => ({
            productoId: BigInt(detalle.productoId),
            cantidad: detalle.cantidad,
            peso: detalle.peso || null,
            lote: detalle.lote || null,
            fechaProduccion: detalle.fechaProduccion || null,
            fechaVencimiento: detalle.fechaVencimiento || null,
            fechaIngreso: detalle.fechaIngreso || null,
            nroSerie: detalle.nroSerie || null,
            nroContenedor: detalle.nroContenedor || null,
            estadoMercaderiaId: detalle.estadoMercaderiaId ? BigInt(detalle.estadoMercaderiaId) : null,
            estadoCalidadId: detalle.estadoCalidadId ? BigInt(detalle.estadoCalidadId) : null,
            entidadComercialId: detalle.entidadComercialId ? BigInt(detalle.entidadComercialId) : null,
            esCustodia: detalle.esCustodia || false,
            empresaId: BigInt(detalle.empresaId),
            observaciones: detalle.observaciones || null,
            costoUnitario: detalle.costoUnitario || null,
            precioUnitario: detalle.precioUnitario || 0,
            creadoPor: detalle.creadoPor ? BigInt(detalle.creadoPor) : null,
            actualizadoPor: detalle.actualizadoPor ? BigInt(detalle.actualizadoPor) : null
          }))
        };
      }
      
      // 7. Crear el movimiento de almacén
      const movimiento = await tx.movimientoAlmacen.create({ 
        data: dataConEstado,
        include: {
          detalles: true,
          conceptoMovAlmacen: true
        }
      });
      
      // 8. Actualizar el correlativo en SerieDoc
      await tx.serieDoc.update({
        where: { id: BigInt(data.serieDocId) },
        data: { correlativo: BigInt(nuevoCorrelativo) }
      });
      
      return movimiento;
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un movimiento existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.movimientoAlmacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MovimientoAlmacen no encontrado');
    
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    
    // Extraer detalles del data (no se actualizan aquí, se manejan por separado)
    const { detalles, ...dataMovimiento } = data;
    
    // Actualizar solo los campos del movimiento, sin detalles
    return await prisma.movimientoAlmacen.update({ 
      where: { id }, 
      data: dataMovimiento,
      include: {
        detalles: true,
        conceptoMovAlmacen: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un movimiento de almacén por ID, validando existencia y que no tenga detalles asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.movimientoAlmacen.findUnique({ where: { id }, include: { detalles: true } });
    if (!existente) throw new NotFoundError('MovimientoAlmacen no encontrado');
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.movimientoAlmacen.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Rellena un número con ceros a la izquierda
 * @param {number} numero - Número a rellenar
 * @param {number} cantidadCeros - Cantidad de ceros a la izquierda
 * @returns {string} - Número con ceros a la izquierda
 */
function llenaNumerosIzquierda(numero, cantidadCeros) {
  return String(numero).padStart(cantidadCeros, '0');
}

/**
 * Obtiene series de documentos filtradas por empresaId, tipoDocumentoId y tipoAlmacenId
 * @param {BigInt} empresaId
 * @param {BigInt} tipoDocumentoId
 * @param {BigInt} tipoAlmacenId
 * @returns {Array} - Array de series de documentos
 */
const obtenerSeriesDoc = async (empresaId, tipoDocumentoId, tipoAlmacenId) => {
  try {
    const where = {
      activo: true
    };

    if (empresaId) where.empresaId = BigInt(empresaId);
    if (tipoDocumentoId) where.tipoDocumentoId = BigInt(tipoDocumentoId);
    if (tipoAlmacenId) where.tipoAlmacenId = BigInt(tipoAlmacenId);

    const series = await prisma.serieDoc.findMany({ where });
    return series;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Genera el número de documento automáticamente basado en la serie seleccionada
 * Incrementa el correlativo y genera numSerieDoc, numCorreDoc y numeroDocumento
 * @param {BigInt} serieDocId - ID de la serie de documento
 * @returns {Object} - Objeto con serieDocId, numSerieDoc, numCorreDoc, numeroDocumento
 */
const generarNumeroDocumento = async (serieDocId) => {
  try {
    // Obtener la serie de documento
    const serieDoc = await prisma.serieDoc.findUnique({
      where: { id: BigInt(serieDocId) }
    });

    if (!serieDoc) {
      throw new NotFoundError('Serie de documento no encontrada');
    }

    // Incrementar el correlativo
    const nuevoCorrelativo = Number(serieDoc.correlativo) + 1;

    // Actualizar el correlativo en la base de datos
    await prisma.serieDoc.update({
      where: { id: BigInt(serieDocId) },
      data: { correlativo: BigInt(nuevoCorrelativo) }
    });

    // Generar los números con ceros a la izquierda
    const numSerieDoc = llenaNumerosIzquierda(
      serieDoc.serie,
      serieDoc.numCerosIzqSerie
    );
    
    const numCorreDoc = llenaNumerosIzquierda(
      nuevoCorrelativo,
      serieDoc.numCerosIzqCorre
    );

    const numeroDocumento = `${numSerieDoc}-${numCorreDoc}`;

    return {
      serieDocId: serieDoc.id,
      numSerieDoc,
      numCorreDoc,
      numeroDocumento
    };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Cierra un movimiento de almacén cambiando su estado a CERRADO (31)
 * @param {BigInt} id - ID del movimiento a cerrar
 * @returns {Object} - Movimiento actualizado
 */
const cerrarMovimiento = async (id) => {
  try {
    const existente = await prisma.movimientoAlmacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MovimientoAlmacen no encontrado');
    
    // Cambiar estado a CERRADO (31)
    return await prisma.movimientoAlmacen.update({ 
      where: { id }, 
      data: { 
        estadoDocAlmacenId: BigInt(31),
        actualizadoEn: new Date()
      },
      include: {
        detalles: true,
        conceptoMovAlmacen: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Anula un movimiento de almacén: elimina kardex, recalcula saldos y cambia estado a ANULADO (32)
 * @param {BigInt} id - ID del movimiento a anular
 * @param {BigInt} empresaId - ID de la empresa
 * @returns {Object} - Resultado de la anulación con resumen
 */
const anularMovimiento = async (id, empresaId) => {
  try {
    const existente = await prisma.movimientoAlmacen.findUnique({ 
      where: { id },
      include: {
        detalles: true,
        conceptoMovAlmacen: {
          include: {
            tipoMovimiento: true
          }
        }
      }
    });
    if (!existente) throw new NotFoundError('MovimientoAlmacen no encontrado');
    
    return await prisma.$transaction(async (tx) => {
      // 1. Eliminar registros de kardex relacionados a este movimiento
      const kardexEliminados = await tx.kardexAlmacen.deleteMany({
        where: {
          movimientoAlmacenId: id
        }
      });

      // 2. Obtener productos únicos afectados para recalcular saldos
      const productosAfectados = [...new Set(existente.detalles.map(d => d.productoId))];
      
      // 3. Recalcular saldos para cada producto afectado
      let saldosDetActualizados = 0;
      let saldosGenActualizados = 0;
      let saldosDetProductoClienteActualizados = 0;
      let saldosProductoClienteActualizados = 0;

      for (const productoId of productosAfectados) {
        // Recalcular saldos detallados
        const saldosDetallados = await tx.kardexAlmacen.groupBy({
          by: ['empresaId', 'almacenId', 'productoId', 'clienteId', 'esCustodia', 'lote', 'fechaIngreso', 'fechaProduccion', 'fechaVencimiento', 'estadoId', 'estadoCalidadId', 'numContenedor', 'nroSerie'],
          where: {
            empresaId: existente.empresaId,
            productoId: productoId
          },
          _sum: {
            cantidad: true,
            peso: true
          }
        });

        // Actualizar o crear saldos detallados
        for (const saldo of saldosDetallados) {
          await tx.saldoAlmacenDetallado.upsert({
            where: {
              empresaId_almacenId_productoId_clienteId_esCustodia_lote_fechaIngreso_fechaProduccion_fechaVencimiento_estadoId_estadoCalidadId_numContenedor_nroSerie: {
                empresaId: saldo.empresaId,
                almacenId: saldo.almacenId,
                productoId: saldo.productoId,
                clienteId: saldo.clienteId,
                esCustodia: saldo.esCustodia,
                lote: saldo.lote,
                fechaIngreso: saldo.fechaIngreso,
                fechaProduccion: saldo.fechaProduccion,
                fechaVencimiento: saldo.fechaVencimiento,
                estadoId: saldo.estadoId,
                estadoCalidadId: saldo.estadoCalidadId,
                numContenedor: saldo.numContenedor,
                nroSerie: saldo.nroSerie
              }
            },
            update: {
              cantidad: saldo._sum.cantidad || 0,
              peso: saldo._sum.peso || 0,
              actualizadoEn: new Date()
            },
            create: {
              empresaId: saldo.empresaId,
              almacenId: saldo.almacenId,
              productoId: saldo.productoId,
              clienteId: saldo.clienteId,
              esCustodia: saldo.esCustodia,
              lote: saldo.lote,
              fechaIngreso: saldo.fechaIngreso,
              fechaProduccion: saldo.fechaProduccion,
              fechaVencimiento: saldo.fechaVencimiento,
              estadoId: saldo.estadoId,
              estadoCalidadId: saldo.estadoCalidadId,
              numContenedor: saldo.numContenedor,
              nroSerie: saldo.nroSerie,
              cantidad: saldo._sum.cantidad || 0,
              peso: saldo._sum.peso || 0
            }
          });
          saldosDetActualizados++;
        }

        // Recalcular saldos generales
        const saldosGenerales = await tx.kardexAlmacen.groupBy({
          by: ['empresaId', 'almacenId', 'productoId', 'clienteId', 'esCustodia'],
          where: {
            empresaId: existente.empresaId,
            productoId: productoId
          },
          _sum: {
            cantidad: true,
            peso: true
          }
        });

        // Actualizar o crear saldos generales
        for (const saldo of saldosGenerales) {
          await tx.saldoAlmacenGeneral.upsert({
            where: {
              empresaId_almacenId_productoId_clienteId_esCustodia: {
                empresaId: saldo.empresaId,
                almacenId: saldo.almacenId,
                productoId: saldo.productoId,
                clienteId: saldo.clienteId,
                esCustodia: saldo.esCustodia
              }
            },
            update: {
              cantidad: saldo._sum.cantidad || 0,
              peso: saldo._sum.peso || 0,
              actualizadoEn: new Date()
            },
            create: {
              empresaId: saldo.empresaId,
              almacenId: saldo.almacenId,
              productoId: saldo.productoId,
              clienteId: saldo.clienteId,
              esCustodia: saldo.esCustodia,
              cantidad: saldo._sum.cantidad || 0,
              peso: saldo._sum.peso || 0
            }
          });
          saldosGenActualizados++;
        }

        // Recalcular SaldosDetProductoCliente (modelo adicional con variables de control)
        const saldosDetProductoCliente = await tx.kardexAlmacen.groupBy({
          by: ['empresaId', 'almacenId', 'productoId', 'clienteId', 'esCustodia', 'lote', 'fechaIngreso', 'fechaProduccion', 'fechaVencimiento', 'estadoId', 'estadoCalidadId', 'numContenedor', 'nroSerie'],
          where: {
            empresaId: existente.empresaId,
            productoId: productoId
          },
          _sum: {
            cantidad: true,
            peso: true
          }
        });

        // Actualizar o crear SaldosDetProductoCliente
        for (const saldo of saldosDetProductoCliente) {
          await tx.saldosDetProductoCliente.upsert({
            where: {
              empresaId_almacenId_productoId_clienteId_esCustodia_lote_fechaIngreso_fechaProduccion_fechaVencimiento_estadoId_estadoCalidadId_numContenedor_nroSerie: {
                empresaId: saldo.empresaId,
                almacenId: saldo.almacenId,
                productoId: saldo.productoId,
                clienteId: saldo.clienteId,
                esCustodia: saldo.esCustodia,
                lote: saldo.lote,
                fechaIngreso: saldo.fechaIngreso,
                fechaProduccion: saldo.fechaProduccion,
                fechaVencimiento: saldo.fechaVencimiento,
                estadoId: saldo.estadoId,
                estadoCalidadId: saldo.estadoCalidadId,
                numContenedor: saldo.numContenedor,
                nroSerie: saldo.nroSerie
              }
            },
            update: {
              saldoCantidad: saldo._sum.cantidad || 0,
              saldoPeso: saldo._sum.peso || 0,
              actualizadoEn: new Date()
            },
            create: {
              empresaId: saldo.empresaId,
              almacenId: saldo.almacenId,
              productoId: saldo.productoId,
              clienteId: saldo.clienteId,
              esCustodia: saldo.esCustodia,
              lote: saldo.lote,
              fechaIngreso: saldo.fechaIngreso,
              fechaProduccion: saldo.fechaProduccion,
              fechaVencimiento: saldo.fechaVencimiento,
              estadoId: saldo.estadoId,
              estadoCalidadId: saldo.estadoCalidadId,
              numContenedor: saldo.numContenedor,
              nroSerie: saldo.nroSerie,
              saldoCantidad: saldo._sum.cantidad || 0,
              saldoPeso: saldo._sum.peso || 0,
              actualizadoEn: new Date()
            }
          });
          saldosDetProductoClienteActualizados++;
        }

        // Recalcular SaldosProductoCliente (modelo adicional general)
        const saldosProductoCliente = await tx.kardexAlmacen.groupBy({
          by: ['empresaId', 'almacenId', 'productoId', 'clienteId', 'esCustodia'],
          where: {
            empresaId: existente.empresaId,
            productoId: productoId
          },
          _sum: {
            cantidad: true,
            peso: true
          }
        });

        // Actualizar o crear SaldosProductoCliente
        for (const saldo of saldosProductoCliente) {
          await tx.saldosProductoCliente.upsert({
            where: {
              empresaId_almacenId_productoId_clienteId_custodia: {
                empresaId: saldo.empresaId,
                almacenId: saldo.almacenId,
                productoId: saldo.productoId,
                clienteId: saldo.clienteId,
                custodia: saldo.esCustodia
              }
            },
            update: {
              saldoCantidad: saldo._sum.cantidad || 0,
              saldoPeso: saldo._sum.peso || 0,
              actualizadoEn: new Date()
            },
            create: {
              empresaId: saldo.empresaId,
              almacenId: saldo.almacenId,
              productoId: saldo.productoId,
              clienteId: saldo.clienteId,
              custodia: saldo.esCustodia,
              saldoCantidad: saldo._sum.cantidad || 0,
              saldoPeso: saldo._sum.peso || 0,
              actualizadoEn: new Date()
            }
          });
          saldosProductoClienteActualizados++;
        }
      }

      // 4. Cambiar estado a ANULADO (32)
      const movimientoAnulado = await tx.movimientoAlmacen.update({ 
        where: { id }, 
        data: { 
          estadoDocAlmacenId: BigInt(32),
          actualizadoEn: new Date()
        },
        include: {
          detalles: true,
          conceptoMovAlmacen: true
        }
      });

      return {
        movimiento: movimientoAnulado,
        kardexEliminados: kardexEliminados.count,
        saldosDetActualizados,
        saldosGenActualizados,
        saldosDetProductoClienteActualizados,
        saldosProductoClienteActualizados,
        productosAfectados: productosAfectados.length
      };
    });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  obtenerSeriesDoc,
  generarNumeroDocumento,
  cerrarMovimiento,
  anularMovimiento
};
