import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CotizacionVentas
 * Gestiona cotizaciones de exportación con cálculo de factor y costos
 * Incluye validaciones de relaciones y campos de auditoría.
 * Documentado en español.
 */

/**
 * Genera código único para la cotización incluyendo versión
 * Formato: COT-YYYY-NNNNNN-VX
 * Ejemplo: COT-2024-000001-V1, COT-2024-000001-V2
 */
async function generarCodigoCotizacion(empresaId, version = 1) {
  const año = new Date().getFullYear();
  
  // Buscar la última cotización del año (solo versión 1)
  const ultimaCotizacion = await prisma.cotizacionVentas.findFirst({
    where: {
      empresaId,
      codigo: {
        startsWith: `COT-${año}-`,
        endsWith: '-V1'
      },
      version: 1
    },
    orderBy: { id: 'desc' }
  });

  let correlativo = 1;
  if (ultimaCotizacion) {
    // Extraer el correlativo del código: COT-2024-000001-V1
    const partes = ultimaCotizacion.codigo.split('-');
    correlativo = parseInt(partes[2]) + 1;
  }

  return `COT-${año}-${String(correlativo).padStart(6, '0')}-V${version}`;
}

/**
 * Lista todas las cotizaciones con sus relaciones
 */
const listar = async () => {
  try {
    return await prisma.cotizacionVentas.findMany({
      include: {
        empresa: true,
        cliente: true,
        tipoDocumento: true,
        serieDoc: true,
        moneda: true,
        formaPago: true,
        incoterms: true,
        estado: true,
        tipoProducto: true,
        destinoProducto: true,
        tipoEstadoProducto: true,
        formaTransaccion: true,
        modoDespachoRecepcion: true,
        tipoContenedor: true,
        detallesProductos: {
          include: {
            producto: true
          }
        },
        costosExportacion: {
          include: {
            producto: true,
            moneda: true
          }
        },
        documentosRequeridos: {
          include: {
            docRequeridaVentas: true,
            moneda: true
          }
        }
      },
      orderBy: { fechaDocumento: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una cotización por ID con todas sus relaciones
 */
const obtenerPorId = async (id) => {
  try {
    const cotizacion = await prisma.cotizacionVentas.findUnique({
      where: { id },
      include: {
        empresa: true,
        cliente: true,
        tipoDocumento: true,
        serieDoc: true,
        moneda: true,
        formaPago: true,
        incoterms: true,
        tipoProducto: true,
        tipoEstadoProducto: true,
        destinoProducto: true,
        formaTransaccion: true,
        modoDespachoRecepcion: true,
        tipoContenedor: true,
        cotizacionPadre: true,
        versiones: true,
        estado: true,
        detallesProductos: {
          include: {
            producto: {
              include: {
                familia: true,
                unidadMedida: true
              }
            }
          },
          orderBy: { item: 'asc' }
        },
        costosExportacion: {
          include: {
            producto: true,
            moneda: true,
            proveedor: true,
            movimientoEntregaRendir: true
          },
          orderBy: { orden: 'asc' }
        },
        documentosRequeridos: {
          include: {
            docRequeridaVentas: true,
            moneda: true
          }
        },
        entregaARendir: {
          include: {
            movimientos: {
              include: {
                tipoMovimiento: true,
                producto: true,
                moneda: true
              }
            }
          }
        }
      }
    });
    if (!cotizacion) throw new NotFoundError('Cotización no encontrada');
    return cotizacion;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene cotizaciones por cliente
 */
const obtenerPorCliente = async (clienteId) => {
  try {
    return await prisma.cotizacionVentas.findMany({
      where: { clienteId },
      include: {
        empresa: true,
        moneda: true,
        incoterms: true,
        tipoProducto: true
      },
      orderBy: { fechaDocumento: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una nueva cotización
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.empresaId || !data.clienteId || !data.tipoDocumentoId || !data.monedaId || !data.formaPagoId) {
      throw new ValidationError('Faltan campos obligatorios: empresaId, clienteId, tipoDocumentoId, monedaId, formaPagoId');
    }
    
    if (!data.serieDocId) {
      throw new ValidationError('El campo serieDocId es obligatorio.');
    }

    // Usar transacción para generar número y actualizar correlativo atómicamente
    return await prisma.$transaction(async (tx) => {
      // 1. Generar código único con versión
      let codigo = data.codigo;
      if (!codigo) {
        const version = data.version || 1;
        codigo = await generarCodigoCotizacion(data.empresaId, version);
      }

      // 2. Validar existencia de empresa
      const empresa = await tx.empresa.findUnique({ where: { id: data.empresaId } });
      if (!empresa) throw new ValidationError('Empresa no existente.');

      // 3. Validar existencia de cliente
      const cliente = await tx.entidadComercial.findUnique({ where: { id: data.clienteId } });
      if (!cliente) throw new ValidationError('Cliente no existente.');

      // 4. Validar Incoterm si se proporciona
      if (data.incotermsId) {
        const incoterm = await tx.incoterm.findUnique({ where: { id: data.incotermsId } });
        if (!incoterm) throw new ValidationError('Incoterm no existente.');
      }

      // 5. Obtener la serie seleccionada
      const serie = await tx.serieDoc.findUnique({
        where: { id: BigInt(data.serieDocId) }
      });
      
      if (!serie) {
        throw new ValidationError('Serie de documento no encontrada.');
      }
      
      // 6. Calcular nuevo correlativo
      const nuevoCorrelativo = Number(serie.correlativo) + 1;
      
      // 7. Generar números con formato
      const numSerie = String(serie.serie).padStart(serie.numCerosIzqSerie, '0');
      const numCorre = String(nuevoCorrelativo).padStart(serie.numCerosIzqCorre, '0');
      const numeroDocumento = `${numSerie}-${numCorre}`;
      
      // 8. Actualizar el correlativo en SerieDoc
      await tx.serieDoc.update({
        where: { id: BigInt(data.serieDocId) },
        data: { correlativo: BigInt(nuevoCorrelativo) }
      });

      // 9. Calcular fechaVencimiento si no viene (30 días después de fechaDocumento)
      let fechaVencimiento = data.fechaVencimiento;
      if (!fechaVencimiento) {
        const fechaDoc = data.fechaDocumento ? new Date(data.fechaDocumento) : new Date();
        fechaVencimiento = new Date(fechaDoc);
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);
      }

      // 10. Obtener autorizaVentaId desde ParametroAprobador si no viene
      let autorizaVentaId = data.autorizaVentaId;
      if (!autorizaVentaId && data.empresaId) {
        const parametroAprobador = await tx.parametroAprobador.findFirst({
          where: {
            empresaId: BigInt(data.empresaId),
            moduloSistemaId: BigInt(5), // 5 = VENTAS
            cesado: false,
          },
        });

        if (parametroAprobador) {
          autorizaVentaId = parametroAprobador.personalRespId;
        } else {
          console.log(`[CotizacionVentas] No se encontró ParametroAprobador para empresaId=${data.empresaId}, moduloSistemaId=5, cesado=false`);
        }
      }

      // 10. Extraer y remover campos de relaciones anidadas
      const { detalles, costos, documentos, ...dataSinRelaciones } = data;

      // 11. Asegurar campos de auditoría
      const datosConAuditoria = {
        ...dataSinRelaciones,
        codigo,
        numSerieDoc: numSerie,
        numCorreDoc: numCorre,
        numeroDocumento,
        fechaVencimiento,
        autorizaVentaId, // Asignado desde ParametroAprobador si no venía
        version: data.version || 1, // Asegurar que siempre tenga versión
        fechaCreacion: data.fechaCreacion || new Date(),
        fechaActualizacion: data.fechaActualizacion || new Date(),
      };

      // 12. Crear la cotización con los números generados
      return await tx.cotizacionVentas.create({
        data: datosConAuditoria,
        include: {
          empresa: true,
          cliente: true,
          tipoDocumento: true,
          serieDoc: true,
          moneda: true,
          formaPago: true,
          incoterms: true
        }
      });
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una cotización existente
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.cotizacionVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Cotización no encontrada');

    // Validar referencias si cambian
    if (data.empresaId && data.empresaId !== existente.empresaId) {
      const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
      if (!empresa) throw new ValidationError('Empresa no existente.');
    }

    if (data.clienteId && data.clienteId !== existente.clienteId) {
      const cliente = await prisma.entidadComercial.findUnique({ where: { id: data.clienteId } });
      if (!cliente) throw new ValidationError('Cliente no existente.');
    }

    if (data.incotermsId && data.incotermsId !== existente.incotermsId) {
      const incoterm = await prisma.incoterm.findUnique({ where: { id: data.incotermsId } });
      if (!incoterm) throw new ValidationError('Incoterm no existente.');
    }

    // Extraer y remover campos que no deben actualizarse
    const {
      detalles,
      costos,
      documentos,
      empresaId,
      clienteId,
      tipoDocumentoId,
      serieDocId,
      monedaId,
      formaPagoId,
      tipoProductoId,
      incotermsId,
      codigo,
      version,
      numSerieDoc,
      numCorreDoc,
      numeroDocumento,
      ...dataSinCamposInmutables
    } = data;

    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...dataSinCamposInmutables,
      fechaCreacion: data.fechaCreacion || existente.fechaCreacion || new Date(),
      creadoPor: data.creadoPor || existente.creadoPor || null,
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };

    return await prisma.cotizacionVentas.update({
      where: { id },
      data: datosConAuditoria,
      include: {
        empresa: true,
        cliente: true,
        tipoDocumento: true,
        serieDoc: true,
        moneda: true,
        formaPago: true,
        incoterms: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una cotización
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.cotizacionVentas.findUnique({
      where: { id },
      include: {
        detallesProductos: true,
        costosExportacion: true,
        documentosRequeridos: true,
        entregaARendir: true,
        versiones: true
      }
    });
    if (!existente) throw new NotFoundError('Cotización no encontrada');

    // Validar que no tenga dependencias
    if (existente.detallesProductos && existente.detallesProductos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene productos asociados.');
    }
    if (existente.costosExportacion && existente.costosExportacion.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene costos de exportación asociados.');
    }
    if (existente.documentosRequeridos && existente.documentosRequeridos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene documentos requeridos asociados.');
    }
    if (existente.entregaARendir) {
      throw new ConflictError('No se puede eliminar porque tiene una entrega a rendir asociada.');
    }
    if (existente.versiones && existente.versiones.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene versiones asociadas.');
    }

    await prisma.cotizacionVentas.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una nueva versión de una cotización existente
 * Mantiene el correlativo base pero incrementa la versión
 * Ejemplo: COT-2024-000001-V1 → COT-2024-000001-V2
 */
const crearVersion = async (cotizacionPadreId, data) => {
  try {
    const cotizacionPadre = await prisma.cotizacionVentas.findUnique({
      where: { id: cotizacionPadreId },
      include: {
        detallesProductos: true,
        costosExportacion: true,
        documentosRequeridos: true
      }
    });

    if (!cotizacionPadre) throw new NotFoundError('Cotización padre no encontrada');

    // Extraer el correlativo base del código padre
    // COT-2024-000001-V1 → extraer "COT-2024-000001"
    const partesCodigo = cotizacionPadre.codigo.split('-V');
    const codigoBase = partesCodigo[0]; // "COT-2024-000001"
    
    // Incrementar versión
    const nuevaVersion = cotizacionPadre.version + 1;
    const nuevoCodigo = `${codigoBase}-V${nuevaVersion}`;

    const nuevaCotizacion = await prisma.cotizacionVentas.create({
      data: {
        ...data,
        codigo: nuevoCodigo,
        version: nuevaVersion,
        cotizacionPadreId,
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      },
      include: {
        empresa: true,
        cliente: true,
        tipoDocumento: true,
        serieDoc: true,
        moneda: true,
        incoterms: true
      }
    });

    return nuevaCotizacion;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene series de documentos filtradas
 * @param {string|number} empresaId - ID de la empresa (opcional)
 * @param {string|number} tipoDocumentoId - ID del tipo de documento (opcional)
 * @returns {Promise<Array>} Series de documentos que cumplen los filtros
 * @description Filtra por:
 *           SerieDoc.activo = true
 *           SerieDoc.tipoDocumentoId = CotizacionVentas.tipoDocumentoId
 */
const obtenerSeriesDoc = async (empresaId, tipoDocumentoId) => {
  try {
    const where = {
      activo: true // Solo series activas
    };
    
    if (empresaId) where.empresaId = BigInt(empresaId);
    if (tipoDocumentoId) where.tipoDocumentoId = BigInt(tipoDocumentoId);
    
    const series = await prisma.serieDoc.findMany({
      where,
      orderBy: {
        serie: 'asc'
      }
    });
    
    return series;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Carga los costos de exportación según el Incoterm seleccionado
 * Si el costo ya existe (mismo productoId), lo actualiza
 * Si no existe, lo crea
 * @param {BigInt} cotizacionId - ID de la cotización
 * @returns {Promise<Object>} Resultado con costos creados y actualizados
 */
const cargarCostosSegunIncoterm = async (cotizacionId) => {
  try {
    // 1. Obtener la cotización con su Incoterm y costos existentes
    const cotizacion = await prisma.cotizacionVentas.findUnique({
      where: { id: cotizacionId },
      include: {
        costosExportacion: true
      }
    });

    if (!cotizacion) {
      throw new NotFoundError('Cotización no encontrada');
    }

    if (!cotizacion.incotermsId) {
      throw new ValidationError('La cotización no tiene un Incoterm seleccionado');
    }

    // 2. Obtener los costos configurados para el Incoterm con todas las relaciones
    const costosIncoterm = await prisma.costoExportacionPorIncoterm.findMany({
      where: {
        incotermId: cotizacion.incotermsId,
        activo: true
      },
      include: {
        producto: true,
        proveedorDefault: true,
        monedaDefault: true,
        documentoAsociado: true
      },
      orderBy: {
        orden: 'asc'
      }
    });

    if (costosIncoterm.length === 0) {
      throw new ValidationError(
        'No hay costos de exportación configurados para el Incoterm seleccionado'
      );
    }

    // 3. Crear mapa de costos existentes por productoId
    const costosExistentesMap = new Map(
      cotizacion.costosExportacion.map(c => [Number(c.productoId), c])
    );

    // 4. Procesar costos: crear o actualizar según corresponda
    const resultado = await prisma.$transaction(async (tx) => {
      const creados = [];
      const actualizados = [];

      for (const costoIncoterm of costosIncoterm) {
        const productoId = Number(costoIncoterm.productoId);
        const costoExistente = costosExistentesMap.get(productoId);

        // Preparar datos base con los nuevos campos
        const datosBase = {
          aplicaSegunIncoterm: true,
          esObligatorio: costoIncoterm.esObligatorio,
          orden: costoIncoterm.orden || 0,
          proveedorId: costoIncoterm.proveedorDefaultId || null,
          requiereDocumento: costoIncoterm.requiereDocumento || false,
          documentoAsociadoId: costoIncoterm.documentoAsociadoId || null,
          fechaActualizacion: new Date()
        };

        if (costoExistente) {
          // Actualizar costo existente
          const costoActualizado = await tx.costosExportacionCotizacion.update({
            where: { id: costoExistente.id },
            data: datosBase,
            include: {
              producto: true,
              moneda: true
            }
          });
          actualizados.push(costoActualizado);
        } else {
          // Crear nuevo costo con valores por defecto del Incoterm
          const monedaId = costoIncoterm.monedaDefaultId || cotizacion.monedaId;
          const montoEstimado = costoIncoterm.valorVentaDefault 
            ? Number(costoIncoterm.valorVentaDefault) 
            : 0;
          
          // Calcular tipo de cambio y monto en moneda base
          const tipoCambio = monedaId === cotizacion.monedaId 
            ? 1 
            : (cotizacion.tipoCambio || 1);
          const montoEstimadoMonedaBase = montoEstimado * tipoCambio;
          
          const nuevoCosto = await tx.costosExportacionCotizacion.create({
            data: {
              cotizacionVentasId: cotizacionId,
              productoId: costoIncoterm.productoId,
              montoEstimado: montoEstimado,
              monedaId: monedaId,
              tipoCambioAplicado: tipoCambio,
              montoEstimadoMonedaBase: montoEstimadoMonedaBase,
              ...datosBase,
              fechaCreacion: new Date()
            },
            include: {
              producto: true,
              moneda: true,
              proveedor: true
            }
          });
          creados.push(nuevoCosto);
        }
      }

      return { creados, actualizados };
    });

    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) {
      throw err;
    }
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

/**
 * Genera automáticamente los documentos requeridos para una cotización
 * basándose en país destino, tipo de producto e incoterm
 * @param {BigInt} cotizacionId - ID de la cotización
 * @param {BigInt} usuarioId - ID del usuario que ejecuta la acción
 * @returns {Object} - { documentosCreados, documentosExistentes }
 */
const generarDocumentosRequeridos = async (cotizacionId, usuarioId) => {
  try {
    // 1. Obtener la cotización con sus datos
    const cotizacion = await prisma.cotizacionVentas.findUnique({
      where: { id: cotizacionId },
      include: {
        moneda: true
      }
    });

    if (!cotizacion) {
      throw new NotFoundError('Cotización no encontrada');
    }

    if (!cotizacion.esExportacion) {
      throw new ValidationError('Esta cotización no es de exportación');
    }

    if (!cotizacion.paisDestinoId || !cotizacion.tipoProductoId) {
      throw new ValidationError('La cotización debe tener país destino y tipo de producto definidos');
    }

    // 2. Buscar documentos requeridos según país y tipo de producto
    const requisitos = await prisma.requisitoDocPorPais.findMany({
      where: {
        paisId: cotizacion.paisDestinoId,
        OR: [
          { tipoProductoId: cotizacion.tipoProductoId },
          { tipoProductoId: null } // Documentos universales
        ],
        esObligatorio: true
      },
      include: {
        docRequeridaVentas: {
          include: {
            moneda: true
          }
        }
      }
    });

    if (requisitos.length === 0) {
      return {
        documentosCreados: [],
        documentosExistentes: [],
        mensaje: 'No se encontraron documentos requeridos para este país y tipo de producto'
      };
    }

    // 3. Obtener documentos ya existentes en la cotización
    const documentosExistentes = await prisma.detDocsReqCotizaVentas.findMany({
      where: { cotizacionVentasId: cotizacionId },
      select: { docRequeridaVentasId: true }
    });

    const idsExistentes = new Set(documentosExistentes.map(d => d.docRequeridaVentasId.toString()));

    // 4. Crear solo los documentos que no existen
    const documentosCreados = [];
    const documentosYaExistentes = [];

    for (const requisito of requisitos) {
      const docId = requisito.docRequeridaVentas.id;

      if (idsExistentes.has(docId.toString())) {
        documentosYaExistentes.push({
          id: docId,
          nombre: requisito.docRequeridaVentas.nombre,
          mensaje: 'Ya existe en la cotización'
        });
        continue;
      }

      // Crear el documento requerido
      const nuevoDoc = await prisma.detDocsReqCotizaVentas.create({
        data: {
          cotizacionVentasId: cotizacionId,
          docRequeridaVentasId: docId,
          esObligatorio: requisito.esObligatorio,
          monedaId: requisito.docRequeridaVentas.monedaId || cotizacion.monedaId,
          costoDocumento: requisito.docRequeridaVentas.costoEstimado || 0,
          observacionesVerificacion: requisito.observaciones,
          verificado: false,
          fechaCreacion: new Date(),
          fechaActualizacion: new Date(),
          creadoPor: usuarioId,
          actualizadoPor: usuarioId
        },
        include: {
          docRequeridaVentas: true,
          moneda: true
        }
      });

      documentosCreados.push({
        id: nuevoDoc.id,
        documentoId: docId,
        nombre: requisito.docRequeridaVentas.nombre,
        esObligatorio: requisito.esObligatorio,
        costoDocumento: nuevoDoc.costoDocumento,
        moneda: nuevoDoc.moneda.simbolo || 'USD'
      });
    }

    return {
      documentosCreados,
      documentosExistentes: documentosYaExistentes,
      totalCreados: documentosCreados.length,
      totalExistentes: documentosYaExistentes.length,
      mensaje: `Se crearon ${documentosCreados.length} documentos. ${documentosYaExistentes.length} ya existían.`
    };

  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) {
      throw err;
    }
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al generar documentos', err.message);
    }
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerPorCliente,
  crear,
  actualizar,
  eliminar,
  crearVersion,
  obtenerSeriesDoc,
  cargarCostosSegunIncoterm,
  generarDocumentosRequeridos
};