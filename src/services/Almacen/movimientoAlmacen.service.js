import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import kardexService from './kardexAlmacen.service.js';
import {
  capturarCombinacionesAfectadas,
  eliminarKardexDeMovimiento,
  recalcularSaldosAfectados,
} from './kardexGenerico.service.js';
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
        preFacturas: true
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
                unidadMedidaComercial: true,
                marca: true,
                familia: true,
                subfamilia: true,
                tipoMaterial: true,
                color: true,
                tipoAlmacenamiento: true
              }
            },
            ubicacionFisicaOrigen: true,
            ubicacionFisicaDestino: true
          }
        },
        preFacturas: true,
        asientosContables: {
          include: {
            estado: true,
            detalles: {
              include: {
                planCuenta: true
              }
            }
          },
          orderBy: { fechaAsiento: 'desc' }
        }
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

      // 4. Crear objeto limpio solo con campos del modelo (patrón estándar)
      const datosLimpios = {
        empresaId: data.empresaId,
        tipoDocumentoId: data.tipoDocumentoId,
        conceptoMovAlmacenId: data.conceptoMovAlmacenId,
        serieDocId: data.serieDocId,
        numSerieDoc: numSerie,
        numCorreDoc: numCorre,
        numeroDocumento,
        fechaDocumento: data.fechaDocumento,
        entidadComercialId: data.entidadComercialId,
        faenaPescaId: data.faenaPescaId,
        embarcacionId: data.embarcacionId,
        ordenTrabajoId: data.ordenTrabajoId,
        dirOrigenId: data.dirOrigenId,
        dirDestinoId: data.dirDestinoId,
        numGuiaSunat: data.numGuiaSunat,
        fechaGuiaSunat: data.fechaGuiaSunat,
        transportistaId: data.transportistaId,
        vehiculoId: data.vehiculoId,
        agenciaEnvioId: data.agenciaEnvioId,
        dirAgenciaEnvioId: data.dirAgenciaEnvioId,
        personalRespAlmacen: data.personalRespAlmacen,
        ordenCompraId: data.ordenCompraId,
        pedidoVentaId: data.pedidoVentaId,
        estadoDocAlmacenId: BigInt(30), // Estado PENDIENTE
        esCustodia: data.esCustodia !== undefined ? data.esCustodia : false,
        observaciones: data.observaciones,
        creadoEn: data.creadoEn || new Date(),
        actualizadoEn: new Date(),
        creadoPor: data.creadoPor,
        actualizadoPor: data.actualizadoPor,
        urlMovAlmacenPdf: data.urlMovAlmacenPdf,
        urlMovAlmacenConCostosPdf: data.urlMovAlmacenConCostosPdf,
        unidadNegocioId: data.unidadNegocioId,
      };

      // 5. Crear el movimiento de almacén (patrón estándar - solo cabecera)
      const movimiento = await tx.movimientoAlmacen.create({
        data: datosLimpios,
        include: {
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
 * Elimina un movimiento de almacén por ID usando sistema SAP
 * Elimina kardex, detalles y regenera saldos automáticamente
 */
const eliminar = async (id) => {
  try {
    // Importar servicio de eliminación SAP
    const eliminarMovimientoService = await import('./eliminarMovimientoAlmacen.service.js');

    // Ejecutar eliminación completa con regeneración SAP
    const resultado = await eliminarMovimientoService.default.eliminarMovimientoAlmacenCompleto(BigInt(id));

    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
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
        detalles: {
          select: {
            id: true,
            productoId: true
          }
        }
      }
    });

    if (!existente) {
      throw new NotFoundError('MovimientoAlmacen no encontrado');
    }

    // Ejecutar en transacción atómica
    return await prisma.$transaction(async (tx) => {
      // ========================================
      // PASO 1: CAPTURAR COMBINACIONES AFECTADAS
      // ========================================
      const combinaciones = await capturarCombinacionesAfectadas(id, tx);

      // ========================================
      // PASO 2: ELIMINAR KARDEX DEL MOVIMIENTO
      // ========================================
      const kardexEliminados = await eliminarKardexDeMovimiento(id, tx);

      // ========================================
      // PASO 3: RECALCULAR SALDOS AFECTADOS
      // ========================================
      const { saldosDetActualizados, saldosGenActualizados } =
        await recalcularSaldosAfectados(combinaciones, tx);

      // ========================================
      // PASO 4: CAMBIAR ESTADO A ANULADO
      // ========================================
      const movimientoAnulado = await tx.movimientoAlmacen.update({
        where: { id },
        data: {
          estadoDocAlmacenId: BigInt(32), // ANULADO
          actualizadoEn: new Date()
        },
        include: {
          detalles: true,
          conceptoMovAlmacen: true
        }
      });

      // Retornar resultado con estadísticas
      return {
        movimiento: movimientoAnulado,
        kardexEliminados,
        saldosDetActualizados,
        saldosGenActualizados,
        productosAfectados: combinaciones.generales.length
      };
    });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al anular movimiento', err.message);
    }
    throw err;
  }
};

/**
 * Reactiva un documento de almacén (cambia estado a PENDIENTE)
 * Permite editar el documento antes de generar kardex
 * @param {BigInt} id - ID del movimiento
 * @param {BigInt} usuarioId - ID del usuario que reactiva
 * @returns {Object} - Movimiento reactivado
 */
const reactivarDocumentoAlmacen = async (id, usuarioId) => {
  try {
    // Obtener el movimiento actual
    const movimiento = await prisma.movimientoAlmacen.findUnique({
      where: { id },
      include: {
        detalles: true,
        conceptoMovAlmacen: true,
        estadoDocAlmacen: true,
      },
    });

    if (!movimiento) {
      throw new NotFoundError("Movimiento de almacén no encontrado");
    }

    // Validar que el movimiento esté CERRADO (31) o KARDEX_GENERADO (33)
    const estadoActual = Number(movimiento.estadoDocAlmacenId);
    if (estadoActual !== 31 && estadoActual !== 33) {
      throw new ValidationError(
        "Solo se pueden reactivar documentos cerrados o con kardex generado"
      );
    }

    // Ejecutar en transacción atómica
    return await prisma.$transaction(async (tx) => {
      // ========================================
      // PASO 1: CAPTURAR COMBINACIONES AFECTADAS
      // ========================================
      const combinaciones = await capturarCombinacionesAfectadas(id, tx);

      // ========================================
      // PASO 2: ELIMINAR KARDEX DEL MOVIMIENTO
      // ========================================
      const kardexEliminados = await eliminarKardexDeMovimiento(id, tx);

      // ========================================
      // PASO 3: RECALCULAR SALDOS AFECTADOS
      // ========================================
      const { saldosDetActualizados, saldosGenActualizados } =
        await recalcularSaldosAfectados(combinaciones, tx);

      // ========================================
      // PASO 4: CAMBIAR ESTADO A PENDIENTE
      // ========================================
      const movimientoReactivado = await tx.movimientoAlmacen.update({
        where: { id },
        data: {
          estadoDocAlmacenId: BigInt(30), // PENDIENTE
          actualizadoEn: new Date(),
          actualizadoPor: usuarioId,
        },
        include: {
          empresa: true,
          tipoDocumento: true,
          conceptoMovAlmacen: true,
          serieDoc: true,
          entidadComercial: true,
          estadoDocAlmacen: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      // Retornar resultado con estadísticas
      return {
        movimiento: movimientoReactivado,
        kardexEliminados,
        saldosDetActualizados,
        saldosGenActualizados,
        productosAfectados: combinaciones.generales.length
      };
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError)
      throw err;
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos al reactivar documento", err.message);
    throw err;
  }
};

/**
 * Genera un borrador de asiento contable de Saldo Inicial para MovimientoAlmacen
 * Solo aplica cuando el concepto es INVENTARIO INICIAL
 * NO lo guarda en BD, solo retorna la estructura para edición
 * Patrón: Igual a OrdenCompra.generarBorradorAsiento
 * 
 * @param {BigInt} movimientoAlmacenId - ID del MovimientoAlmacen
 * @returns {Promise<Object>} - Borrador del asiento contable
 */
const generarBorradorAsientoSaldoInicial = async (movimientoAlmacenId) => {
  try {
    const movimiento = await prisma.movimientoAlmacen.findUnique({
      where: { id: movimientoAlmacenId },
      include: {
        empresa: true,
        conceptoMovAlmacen: true,
        detalles: {
          include: {
            producto: {
              include: {
                cuentaInventario: true,
              },
            },
          },
        },
      },
    });

    if (!movimiento) {
      throw new NotFoundError("MovimientoAlmacen no encontrado");
    }

    // Validar que es INVENTARIO INICIAL
    if (
      Number(movimiento.conceptoMovAlmacen.tipoConceptoId) !== 4 ||
      Number(movimiento.conceptoMovAlmacen.tipoMovimientoId) !== 2 ||
      movimiento.conceptoMovAlmacen.descripcion !== "INVENTARIO INICIAL"
    ) {
      throw new ValidationError(
        "Este movimiento no es un INVENTARIO INICIAL. Solo se pueden generar asientos de saldo inicial para movimientos con concepto de Inventario Inicial."
      );
    }

    // Obtener periodo contable de la fecha del documento
    const mes = new Date(movimiento.fechaDocumento).getMonth() + 1;
    const anio = new Date(movimiento.fechaDocumento).getFullYear();

    const periodoContable = await prisma.periodoContable.findFirst({
      where: {
        empresaId: movimiento.empresaId,
        mes: mes,
        anio: anio,
      },
    });

    if (!periodoContable) {
      throw new ValidationError(
        `No se encontró un período contable para ${mes}/${anio}. ` +
        "Cree el período contable antes de generar el asiento."
      );
    }

    // ========================================
    // BUSCAR CUENTA 591101 (Resultados Acumulados)
    // ========================================
    const cuentaResultados = await prisma.planCuentasContable.findFirst({
      where: {
        codigoCuenta: "591101",
        activo: true,
      },
    });

    if (!cuentaResultados) {
      throw new ValidationError(
        "No se encontró la cuenta 591101 (Resultados Acumulados). " +
        "Configure el plan de cuentas antes de generar el asiento."
      );
    }

    // Determinar tipo de libro según esGerencial
    const tipoLibro = movimiento.esGerencial ? "GERENCIAL" : "FISCAL";

    const borrador = {
      empresaId: movimiento.empresaId,
      periodoContableId: periodoContable.id,
      fechaAsiento: movimiento.fechaDocumento,
      glosa: `Saldo Inicial Inventario según ${movimiento.numeroDocumento}`,
      tipoLibro: tipoLibro,
      origenAsiento: "AUTOMATICO",
      monedaId: 1, // Siempre en soles
      tipoCambio: null,
      detalles: [],
    };

    // ========================================
    // GENERAR DETALLES DEL ASIENTO
    // ========================================
    let numeroLinea = 1;
    let totalDebe = 0;

    // DEBE: Por cada producto con su cuenta de inventario
    for (const detalle of movimiento.detalles) {
      if (!detalle.producto.cuentaInventarioId) {
        throw new ValidationError(
          `El producto "${detalle.producto.descripcionBase}" (ID: ${detalle.producto.id}) no tiene cuenta de inventario configurada. ` +
          "Configure las cuentas contables antes de generar el asiento."
        );
      }

      const montoDebe = Number(detalle.cantidad) * Number(detalle.costoUnitario);
      totalDebe += montoDebe;

      borrador.detalles.push({
        numeroLinea: numeroLinea++,
        planCuentaId: detalle.producto.cuentaInventarioId,
        glosa: `Saldo Inicial ${detalle.producto.descripcionBase}`,
        debe: montoDebe,
        haber: 0,
        monedaId: 1,
        tipoCambio: null,
      });
    }

    // HABER: Cuenta 591101 (Resultados Acumulados) con el total
    borrador.detalles.push({
      numeroLinea: numeroLinea++,
      planCuentaId: cuentaResultados.id,
      glosa: `Saldo Inicial Inventario según ${movimiento.numeroDocumento}`,
      debe: 0,
      haber: totalDebe,
      monedaId: 1,
      tipoCambio: null,
    });

    return borrador;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Guarda un asiento contable editado para MovimientoAlmacen
 * Patrón: Igual a OrdenCompra.guardarAsientoContable
 * 
 * @param {BigInt} movimientoAlmacenId - ID del MovimientoAlmacen
 * @param {Object} asientoData - Datos del asiento contable
 * @param {BigInt} creadoPor - ID del usuario que crea el asiento
 * @returns {Promise<Object>} - Asiento contable creado
 */
const guardarAsientoContable = async (movimientoAlmacenId, asientoData, creadoPor) => {
  try {
    // ⭐ VALIDAR QUE asientoData TENGA LA ESTRUCTURA CORRECTA
    if (!asientoData) {
      throw new ValidationError("No se recibieron datos del asiento contable");
    }

    if (!asientoData.detalles || !Array.isArray(asientoData.detalles)) {
      throw new ValidationError(
        `Estructura de asiento inválida. Se esperaba 'detalles' como array, se recibió: ${typeof asientoData.detalles}`
      );
    }

    if (asientoData.detalles.length === 0) {
      throw new ValidationError("El asiento debe tener al menos un detalle");
    }

    // ✅ DETECTAR SI ES EDICIÓN O CREACIÓN
    const esEdicion = asientoData.id !== undefined && asientoData.id !== null;

    // Buscar submódulo "MovimientoAlmacen" dinámicamente
    const submodulo = await prisma.submoduloSistema.findFirst({
      where: {
        nombreModeloOrigen: "MovimientoAlmacen",
        activo: true,
      },
    });

    if (!submodulo) {
      throw new ValidationError(
        'No se encontró el submódulo "MovimientoAlmacen" en el sistema.'
      );
    }

    // ⭐ Calcular totales EN SOLES
    const totalDebe = asientoData.detalles.reduce(
      (sum, d) => sum + Math.abs(Number(d.debe || 0)),
      0
    );
    const totalHaber = asientoData.detalles.reduce(
      (sum, d) => sum + Math.abs(Number(d.haber || 0)),
      0
    );

    // ⭐ Validar cuadratura
    const diferencia = totalDebe - totalHaber;

    if (Math.abs(diferencia) > 0.01) {
      throw new ValidationError(
        `El asiento no está cuadrado. Diferencia: ${diferencia.toFixed(2)}`
      );
    }

    // Buscar estado "PENDIENTE" para Asientos Contables
    const ESTADO_ASIENTO_CONTABLE = { PENDIENTE: 76 };
    const estadoPendiente = await prisma.estadoMultiFuncion.findFirst({
      where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
    });

    if (!estadoPendiente) {
      throw new ValidationError(
        "No se encontró el estado 'PENDIENTE' para asientos contables."
      );
    }

    return await prisma.$transaction(async (tx) => {
      let asiento;

      if (esEdicion) {
        // ✅ EDITAR: Actualizar asiento existente
        const detallesExistentes = await tx.detalleAsientoContable.findMany({
          where: { asientoContableId: Number(asientoData.id) },
          select: { id: true },
        });

        asiento = await tx.asientoContable.update({
          where: { id: Number(asientoData.id) },
          data: {
            fechaAsiento: asientoData.fechaAsiento,
            glosa: asientoData.glosa,
            tipoLibro: asientoData.tipoLibro,
            estadoId: estadoPendiente.id,
            totalDebe: totalDebe,
            totalHaber: totalHaber,
            diferencia: diferencia,
            estaCuadrado: Math.abs(diferencia) < 0.01,
            monedaId: asientoData.monedaId,
            tipoCambio: asientoData.tipoCambio,
          },
        });

        // Actualizar detalles
        for (let i = 0; i < asientoData.detalles.length; i++) {
          const detalle = asientoData.detalles[i];
          const detalleExistente = detallesExistentes[i];

          if (detalleExistente) {
            await tx.detalleAsientoContable.update({
              where: { id: detalleExistente.id },
              data: {
                numeroLinea: detalle.numeroLinea,
                planCuentaId: detalle.planCuentaId,
                glosa: detalle.glosa,
                debe: detalle.debe,
                haber: detalle.haber,
                monedaId: asientoData.monedaId,
                tipoCambio: asientoData.tipoCambio,
                centroCostoId: detalle.centroCostoId || null,
                entidadComercialId: detalle.entidadComercialId || null,
              },
            });
          } else {
            await tx.detalleAsientoContable.create({
              data: {
                asientoContableId: Number(asientoData.id),
                numeroLinea: detalle.numeroLinea,
                planCuentaId: detalle.planCuentaId,
                glosa: detalle.glosa,
                debe: detalle.debe,
                haber: detalle.haber,
                monedaId: asientoData.monedaId,
                tipoCambio: asientoData.tipoCambio,
                centroCostoId: detalle.centroCostoId || null,
                entidadComercialId: detalle.entidadComercialId || null,
                submoduloOrigenLineaId: submodulo.id,
                procesoOrigenLineaId: movimientoAlmacenId,
                creadoPor: creadoPor,
              },
            });
          }
        }
      } else {
        // ✅ CREAR: Nuevo asiento
        const ultimoAsiento = await tx.asientoContable.findFirst({
          where: {
            empresaId: asientoData.empresaId,
            periodoContableId: asientoData.periodoContableId,
          },
          orderBy: { correlativo: "desc" },
        });

        const nuevoCorrelativo = ultimoAsiento
          ? ultimoAsiento.correlativo + 1
          : 1;
        const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(nuevoCorrelativo).padStart(5, "0")}`;

        asiento = await tx.asientoContable.create({
          data: {
            empresaId: asientoData.empresaId,
            periodoContableId: asientoData.periodoContableId,
            numeroAsiento: numeroAsiento,
            correlativo: nuevoCorrelativo,
            fechaAsiento: asientoData.fechaAsiento,
            glosa: asientoData.glosa,
            tipoLibro: asientoData.tipoLibro,
            origenAsiento: "AUTOMATICO",
            submoduloOrigenId: submodulo.id,
            procesoOrigenId: movimientoAlmacenId,
            estadoId: estadoPendiente.id,
            totalDebe: totalDebe,
            totalHaber: totalHaber,
            diferencia: diferencia,
            estaCuadrado: Math.abs(diferencia) < 0.01,
            monedaId: asientoData.monedaId,
            tipoCambio: asientoData.tipoCambio,
            esSaldoInicial: true, // ⭐ IMPORTANTE: Marcar como saldo inicial
            creadoPor: creadoPor,
            movimientosAlmacen: {
              connect: { id: movimientoAlmacenId },
            },
            detalles: {
              create: asientoData.detalles.map((detalle) => ({
                numeroLinea: detalle.numeroLinea,
                planCuentaId: detalle.planCuentaId,
                glosa: detalle.glosa,
                debe: detalle.debe,
                haber: detalle.haber,
                monedaId: asientoData.monedaId,
                tipoCambio: asientoData.tipoCambio,
                centroCostoId: detalle.centroCostoId || null,
                entidadComercialId: detalle.entidadComercialId || null,
                submoduloOrigenLineaId: submodulo.id,
                procesoOrigenLineaId: movimientoAlmacenId,
                creadoPor: creadoPor,
              })),
            },
          },
        });
      }

      // Retornar asiento con detalles incluidos
      return await tx.asientoContable.findUnique({
        where: { id: asiento.id },
        include: {
          estado: true,
          detalles: {
            include: {
              planCuenta: true,
            },
          },
        },
      });
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
    throw err;
  }
};

/**
 * Elimina un asiento contable de MovimientoAlmacen
 * Patrón: Igual a OrdenCompra.eliminarAsientoContable
 * 
 * @param {BigInt} asientoId - ID del asiento a eliminar
 * @returns {Promise<boolean>} - true si se eliminó correctamente
 */
const eliminarAsientoContable = async (asientoId) => {
  try {
    const asiento = await prisma.asientoContable.findUnique({
      where: { id: asientoId },
      include: {
        estado: true,
      },
    });

    if (!asiento) {
      throw new NotFoundError("Asiento contable no encontrado");
    }

    // Solo permitir eliminar si está en estado PENDIENTE (76)
    if (Number(asiento.estadoId) !== 76) {
      throw new ValidationError(
        `No se puede eliminar el asiento. Solo se pueden eliminar asientos en estado PENDIENTE. Estado actual: ${asiento.estado.descripcion}`
      );
    }

    await prisma.$transaction(async (tx) => {
      // Eliminar detalles primero
      await tx.detalleAsientoContable.deleteMany({
        where: { asientoContableId: asientoId },
      });

      // Eliminar asiento
      await tx.asientoContable.delete({
        where: { id: asientoId },
      });
    });

    return true;
  } catch (err) {
    if (err.code && err.code.startsWith("P"))
      throw new DatabaseError("Error de base de datos", err.message);
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
  anularMovimiento,
  reactivarDocumentoAlmacen,
  generarBorradorAsientoSaldoInicial,
  guardarAsientoContable,
  eliminarAsientoContable,
};