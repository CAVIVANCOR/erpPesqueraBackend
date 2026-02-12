import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import { validarTipoCambio } from '../../utils/tipoCambio.util.js';

/**
 * Servicio CRUD para PreFactura
 * Gestiona pre-facturas generadas desde cotizaciones aprobadas
 * Incluye generación automática de código y número de documento
 * Documentado en español.
 */

/**
 * Genera código único para la pre-factura
 * Formato: PF-YYYY-NNNNNN
 * Ejemplo: PF-2024-000001
 */
async function generarCodigoPreFactura(empresaId) {
  const año = new Date().getFullYear();
  
  // Buscar la última pre-factura del año
  const ultimaPreFactura = await prisma.preFactura.findFirst({
    where: {
      empresaId,
      codigo: {
        startsWith: `PF-${año}-`
      }
    },
    orderBy: { id: 'desc' }
  });

  let correlativo = 1;
  if (ultimaPreFactura) {
    // Extraer el correlativo del código: PF-2024-000001
    const partes = ultimaPreFactura.codigo.split('-');
    correlativo = parseInt(partes[2]) + 1;
  }

  return `PF-${año}-${String(correlativo).padStart(6, '0')}`;
}

async function validarUnicidadCodigo(codigo, id = null) {
  const where = id ? { codigo, NOT: { id } } : { codigo };
  const existe = await prisma.preFactura.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe una PreFactura con ese código.');
}

async function validarClavesForaneas(data) {
  const checks = [
    prisma.empresa.findUnique({ where: { id: data.empresaId } }),
    prisma.entidadComercial.findUnique({ where: { id: data.clienteId } }),
    prisma.tipoDocumento.findUnique({ where: { id: data.tipoDocumentoId } }),
    prisma.formaPago.findUnique({ where: { id: data.formaPagoId } }),
    prisma.estadoMultiFuncion.findUnique({ where: { id: data.estadoId } }),
    data.serieDocId ? prisma.serieDoc.findUnique({ where: { id: data.serieDocId } }) : Promise.resolve(true),
    data.preFacturaOrigenId ? prisma.preFactura.findUnique({ where: { id: data.preFacturaOrigenId } }) : Promise.resolve(true),
    data.cotizacionVentaId ? prisma.cotizacionVentas.findUnique({ where: { id: data.cotizacionVentaId } }) : Promise.resolve(true),
    data.movSalidaAlmacenId ? prisma.movimientoAlmacen.findUnique({ where: { id: data.movSalidaAlmacenId } }) : Promise.resolve(true),
    data.contratoServicioId ? prisma.contratoServicio.findUnique({ where: { id: data.contratoServicioId } }) : Promise.resolve(true),
    data.paisDestinoId ? prisma.pais.findUnique({ where: { id: data.paisDestinoId } }) : Promise.resolve(true),
    data.puertoEmbarqueId ? prisma.puertoPesca.findUnique({ where: { id: data.puertoEmbarqueId } }) : Promise.resolve(true),
    data.puertoDestinoId ? prisma.puertoPesca.findUnique({ where: { id: data.puertoDestinoId } }) : Promise.resolve(true),
    data.incotermId ? prisma.incoterm.findUnique({ where: { id: data.incotermId } }) : Promise.resolve(true),
    data.agenteAduanaId ? prisma.entidadComercial.findUnique({ where: { id: data.agenteAduanaId } }) : Promise.resolve(true),
    data.bancoId ? prisma.banco.findUnique({ where: { id: data.bancoId } }) : Promise.resolve(true),
    data.monedaId ? prisma.moneda.findUnique({ where: { id: data.monedaId } }) : Promise.resolve(true),
    data.centroCostoId ? prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }) : Promise.resolve(true)
  ];
const [empresa, cliente, tipoDoc, formaPago, estado, serieDoc, preFacturaOrigen, cotizacion, movSalida, contratoServicio, paisDestino, puertoEmbarque, puertoDestino, incoterm, agenteAduana, banco, moneda, centroCosto] = await Promise.all(checks);
  if (!empresa) throw new ValidationError('El empresaId no existe.');
  if (!cliente) throw new ValidationError('El clienteId no existe.');
  if (!tipoDoc) throw new ValidationError('El tipoDocumentoId no existe.');
  if (!formaPago) throw new ValidationError('El formaPagoId no existe.');
  if (!estado) throw new ValidationError('El estadoId no existe.');
  if (data.serieDocId && !serieDoc) throw new ValidationError('El serieDocId no existe.');
  if (data.preFacturaOrigenId && !preFacturaOrigen) throw new ValidationError('La PreFactura Origen no existe.');
  if (data.cotizacionVentaId && !cotizacion) throw new ValidationError('El cotizacionVentaId no existe.');
  if (data.movSalidaAlmacenId && !movSalida) throw new ValidationError('El movSalidaAlmacenId no existe.');
  if (data.contratoServicioId && !contratoServicio) throw new ValidationError('El Contrato de Servicio no existe.');
  if (data.paisDestinoId && !paisDestino) throw new ValidationError('El paisDestinoId no existe.');
  if (data.puertoEmbarqueId && !puertoEmbarque) throw new ValidationError('El puertoEmbarqueId no existe.');
  if (data.puertoDestinoId && !puertoDestino) throw new ValidationError('El puertoDestinoId no existe.');
  if (data.incotermId && !incoterm) throw new ValidationError('El incotermId no existe.');
  if (data.agenteAduanaId && !agenteAduana) throw new ValidationError('El agenteAduanaId no existe.');
  if (data.bancoId && !banco) throw new ValidationError('El bancoId no existe.');
  if (data.monedaId && !moneda) throw new ValidationError('El monedaId no existe.');
  if (data.centroCostoId && !centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.preFactura.findMany({
      include: {
        empresa: true,
        cliente: true,
        tipoDocumento: true,
        serieDoc: true,
        moneda: true,
        formaPago: true,
        incoterm: true,
        tipoContenedor: true,
        detalles: {
          include: {
            producto: true
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

const obtenerPorId = async (id) => {
  try {
    const pf = await prisma.preFactura.findUnique({ 
      where: { id },
      include: {
        empresa: true,
        cliente: true,
        tipoDocumento: true,
        serieDoc: true,
        moneda: true,
        formaPago: true,
        incoterm: true,
        tipoContenedor: true,
        movSalidaAlmacen: true,
        contratoServicio: true,
        tipoDocumentoFinal: true,
        serieDocFinal: true,
        comprobantesElectronicos: {
          include: {
            tipoComprobante: true,
            estadoOSE: true,
            estadoSUNAT: true
          }
        },
        detalles: {
          include: {
            producto: {
              include: {
                familia: true,
                unidadMedida: true
              }
            }
          },
          orderBy: { id: 'asc' }
        }
      }
    });
    if (!pf) throw new NotFoundError('PreFactura no encontrada');
    return pf;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorCliente = async (clienteId) => {
  try {
    return await prisma.preFactura.findMany({
      where: { clienteId },
      include: {
        empresa: true,
        tipoDocumento: true,
        moneda: true,
        incoterm: true
      },
      orderBy: { fechaDocumento: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorCotizacion = async (cotizacionVentaId) => {
  try {
    return await prisma.preFactura.findMany({
      where: { cotizacionVentaId },
      include: {
        empresa: true,
        cliente: true,
        tipoDocumento: true,
        moneda: true,
        incoterm: true,
        detalles: {
          include: {
            producto: true
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

const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.empresaId || !data.clienteId || !data.tipoDocumentoId || !data.monedaId || !data.formaPagoId || !data.estadoId) {
      throw new ValidationError('Faltan campos obligatorios: empresaId, clienteId, tipoDocumentoId, monedaId, formaPagoId, estadoId');
    }
    
    if (!data.serieDocId) {
      throw new ValidationError('El campo serieDocId es obligatorio.');
    }

    // ✅ Validar y obtener tipo de cambio si es necesario
    const tipoCambioFinal = await validarTipoCambio(
      data.tipoCambio,
      data.fechaDocumento || new Date(),
    );

    // Usar transacción para generar número y actualizar correlativo atómicamente
    return await prisma.$transaction(async (tx) => {
      // 1. Generar código único
      let codigo = data.codigo;
      if (!codigo) {
        codigo = await generarCodigoPreFactura(data.empresaId);
      }

      // 2. Validar existencia de empresa
      const empresa = await tx.empresa.findUnique({ where: { id: data.empresaId } });
      if (!empresa) throw new ValidationError('Empresa no existente.');

      // 3. Validar existencia de cliente
      const cliente = await tx.entidadComercial.findUnique({ where: { id: data.clienteId } });
      if (!cliente) throw new ValidationError('Cliente no existente.');

      // 4. Validar Incoterm si se proporciona
      if (data.incotermId) {
        const incoterm = await tx.incoterm.findUnique({ where: { id: data.incotermId } });
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

      // 10. Crear objeto limpio solo con campos del modelo (patrón estándar)
      const datosLimpios = {
        codigo,
        empresaId: data.empresaId,
        tipoDocumentoId: data.tipoDocumentoId,
        serieDocId: data.serieDocId,
        numeroDocumento,
        numSerieDoc: numSerie,
        numCorreDoc: numCorre,
        fechaDocumento: data.fechaDocumento,
        fechaVencimiento,
        tipoDocumentoFinalId: data.tipoDocumentoFinalId,
        serieDocFinalId: data.serieDocFinalId,
        numeroDocumentoFinal: data.numeroDocumentoFinal,
        numSerieDocFinal: data.numSerieDocFinal,
        numCorreDocFinal: data.numCorreDocFinal,
        facturado: data.facturado,
        fechaFacturacion: data.fechaFacturacion,
        esGerencial: data.esGerencial,
        preFacturaOrigenId: data.preFacturaOrigenId,
        esParticionada: data.esParticionada !== undefined ? data.esParticionada : false,
        clienteId: data.clienteId,
        contactoClienteId: data.contactoClienteId,
        dirEntregaId: data.dirEntregaId,
        dirFiscalId: data.dirFiscalId,
        respVentasId: data.respVentasId,
        autorizaVentaId: data.autorizaVentaId,
        supervisorVentaCampoId: data.supervisorVentaCampoId,
        respEmbarqueId: data.respEmbarqueId,
        respProduccionId: data.respProduccionId,
        respAlmacenId: data.respAlmacenId,
        tipoProductoId: data.tipoProductoId,
        formaPagoId: data.formaPagoId,
        bancoId: data.bancoId,
        monedaId: data.monedaId,
        tipoCambio: tipoCambioFinal, // ✅ Usar valor validado
        subtotal: data.subtotal,
        totalDescuentos: data.totalDescuentos,
        totalIGV: data.totalIGV,
        total: data.total,
        montoAdelantadoCliente: data.montoAdelantadoCliente,
        porcentajeAdelanto: data.porcentajeAdelanto,
        estadoId: data.estadoId,
        motivoRechazo: data.motivoRechazo,
        fechaAprobacion: data.fechaAprobacion,
        aprobadoPorId: data.aprobadoPorId,
        preFacturaOrigenId: data.preFacturaOrigenId,
        cotizacionVentaId: data.cotizacionVentaId,
        incotermId: data.incotermId,
        puertoEmbarqueId: data.puertoEmbarqueId,
        puertoDestinoId: data.puertoDestinoId,
        paisDestinoId: data.paisDestinoId,
        agenteAduanaId: data.agenteAduanaId,
        numeroBuque: data.numeroBuque,
        numeroBL: data.numeroBL,
        numContenedor: data.numContenedor,
        tipoContenedorId: data.tipoContenedorId,
        exoneradoIgv: data.exoneradoIgv !== undefined ? data.exoneradoIgv : false,
        porcentajeIgv: data.porcentajeIgv,
        factorExportacion: data.factorExportacion,
        factorExportacionReal: data.factorExportacionReal,
        observaciones: data.observaciones,
        urlPreFacturaPdf: data.urlPreFacturaPdf,
        centroCostoId: data.centroCostoId,
        contratoServicioId: data.contratoServicioId,
        movSalidaAlmacenId: data.movSalidaAlmacenId,
        fechaCreacion: data.fechaCreacion || new Date(),
        fechaActualizacion: data.fechaActualizacion || new Date(),
        creadoPor: data.creadoPor,
        actualizadoPor: data.actualizadoPor,
      };

      // 11. Crear la pre-factura con los números generados (patrón estándar)
      const preFacturaCreada = await tx.preFactura.create({
        data: datosLimpios,
        include: {
          empresa: true,
          cliente: true,
          tipoDocumento: true,
          serieDoc: true,
          moneda: true,
          formaPago: true,
          incoterm: true
        }
      });

      return preFacturaCreada;
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.preFactura.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('PreFactura no encontrada');
    if (data.codigo && data.codigo !== existente.codigo) {
      await validarUnicidadCodigo(data.codigo, id);
    }
    // Validar claves foráneas si cambian
    const claves = ['empresaId','clienteId','tipoDocumentoId','formaPagoId','estadoId','serieDocId','preFacturaOrigenId','cotizacionVentaId','contratoServicioId','movSalidaAlmacenId','paisDestinoId','puertoEmbarqueId','puertoDestinoId','incotermId','agenteAduanaId','bancoId','monedaId','centroCostoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }

    // ✅ Validar y obtener tipo de cambio si es necesario
    if (data.hasOwnProperty('tipoCambio')) {
      data.tipoCambio = await validarTipoCambio(
        data.tipoCambio,
        data.fechaDocumento || existente.fechaDocumento,
      );
    }
    
    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaCreacion: data.fechaCreacion || existente.fechaCreacion || new Date(),
      creadoPor: data.creadoPor || existente.creadoPor || null,
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };
    
    return await prisma.preFactura.update({ 
      where: { id }, 
      data: datosConAuditoria,
      include: {
        empresa: true,
        cliente: true,
        tipoDocumento: true,
        moneda: true,
        incoterm: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.preFactura.findUnique({
      where: { id },
      include: { detalles: true }
    });
    if (!existente) throw new NotFoundError('PreFactura no encontrada');
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.preFactura.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * ========================================
 * FUNCIONES DE GENERACIÓN DE COMPROBANTES
 * ========================================
 */

/**
 * Genera una Factura Electrónica desde una PreFactura
 */
const generarFacturaDesdePreFactura = async (preFacturaId, datosFactura = {}) => {
  try {
    // 1. Obtener PreFactura con detalles
    const preFactura = await prisma.preFactura.findUnique({
      where: { id: preFacturaId },
      include: {
        empresa: true,
        cliente: true,
        moneda: true,
        formaPago: true,
        detalles: {
          include: {
            producto: {
              include: {
                unidadMedida: true
              }
            }
          },
          orderBy: { id: 'asc' }
        }
      }
    });

    if (!preFactura) {
      throw new NotFoundError('PreFactura no encontrada');
    }

    if (preFactura.facturado) {
      throw new ConflictError('Esta PreFactura ya fue facturada');
    }

    if (!preFactura.detalles || preFactura.detalles.length === 0) {
      throw new ValidationError('La PreFactura debe tener detalles para generar factura');
    }

    // 2. Obtener tipo documento Factura (código 01)
    const tipoFactura = await prisma.tipoDocumento.findFirst({
      where: { codigo: '01' }
    });

    if (!tipoFactura) {
      throw new ValidationError('No se encontró el tipo de documento Factura (código 01)');
    }

    // 3. Obtener serie para facturas
    const serieFactura = datosFactura.serieDocId 
      ? await prisma.serieDoc.findUnique({ where: { id: BigInt(datosFactura.serieDocId) } })
      : await prisma.serieDoc.findFirst({
          where: {
            empresaId: preFactura.empresaId,
            tipoDocumentoId: tipoFactura.id,
            activo: true
          }
        });

    if (!serieFactura) {
      throw new ValidationError('No se encontró una serie activa para Facturas');
    }

    // 4. Obtener sede (usar la primera activa)
    const sede = await prisma.sedesEmpresa.findFirst({
      where: {
        empresaId: preFactura.empresaId,
        activo: true
      }
    });

    if (!sede) {
      throw new ValidationError('No se encontró una sede activa para la empresa');
    }

    // 5. Obtener estados
    const estadoOSE = await prisma.estadoMultiFuncion.findFirst({
      where: { codigo: 'OSE_PENDIENTE', modulo: 'COMPROBANTES_ELECTRONICOS' }
    });

    const estadoSUNAT = await prisma.estadoMultiFuncion.findFirst({
      where: { codigo: 'SUNAT_ACTIVO', modulo: 'COMPROBANTES_ELECTRONICOS' }
    });

    if (!estadoOSE || !estadoSUNAT) {
      throw new ValidationError('No se encontraron los estados necesarios para comprobantes');
    }

    // 6. Crear comprobante en transacción
    return await prisma.$transaction(async (tx) => {
      // 6.1. Calcular correlativo
      const nuevoCorrelativo = Number(serieFactura.correlativo) + 1;
      const numSerie = String(serieFactura.serie).padStart(serieFactura.numCerosIzqSerie, '0');
      const numCorre = String(nuevoCorrelativo).padStart(serieFactura.numCerosIzqCorre, '0');
      const numeroCompleto = `${numSerie}-${numCorre}`;

      // 6.2. Actualizar correlativo
      await tx.serieDoc.update({
        where: { id: serieFactura.id },
        data: { correlativo: BigInt(nuevoCorrelativo) }
      });

      // 6.3. Crear comprobante electrónico
      const comprobante = await tx.comprobanteElectronico.create({
        data: {
          preFacturaId: preFactura.id,
          empresaId: preFactura.empresaId,
          sedeId: sede.id,
          tipoComprobanteId: tipoFactura.id,
          serieDocId: serieFactura.id,
          numeroSerie: numSerie,
          numeroCorrelativo: nuevoCorrelativo,
          numeroCompleto: numeroCompleto,
          fechaEmision: datosFactura.fechaEmision ? new Date(datosFactura.fechaEmision) : new Date(),
          horaEmision: new Date().toTimeString().split(' ')[0],
          fechaVencimiento: preFactura.fechaVencimiento,
          entidadComercialId: preFactura.clienteId,
          tipoDocumentoClienteId: preFactura.cliente.tipoDocumentoId,
          numeroDocumentoCliente: preFactura.cliente.numeroDocumento,
          razonSocialCliente: preFactura.cliente.razonSocial,
          direccionCliente: preFactura.cliente.direccion || '',
          emailCliente: preFactura.cliente.email,
          monedaId: preFactura.monedaId,
          tipoCambio: preFactura.tipoCambio,
          formaPagoId: preFactura.formaPagoId,
          estadoOSEId: estadoOSE.id,
          estadoSUNATId: estadoSUNAT.id,
          observaciones: datosFactura.observaciones || preFactura.observaciones,
          creadoPor: datosFactura.creadoPor
        }
      });

      // 6.4. Crear detalles del comprobante
      for (const detalle of preFactura.detalles) {
        await tx.detalleComprobante.create({
          data: {
            comprobanteElectronicoId: comprobante.id,
            productoId: detalle.productoId,
            descripcion: detalle.producto?.nombre || '',
            cantidad: detalle.cantidad,
            unidadMedida: detalle.producto?.unidadMedida?.codigo || 'NIU',
            precioUnitario: detalle.precioUnitario || 0,
            valorVenta: Number(detalle.cantidad) * Number(detalle.precioUnitario || 0)
          }
        });
      }

      // 6.5. Actualizar PreFactura
      await tx.preFactura.update({
        where: { id: preFactura.id },
        data: {
          tipoDocumentoFinalId: tipoFactura.id,
          serieDocFinalId: serieFactura.id,
          numeroDocumentoFinal: numeroCompleto,
          numSerieDocFinal: numSerie,
          numCorreDocFinal: numCorre,
          facturado: true,
          fechaFacturacion: new Date()
        }
      });

      // 6.6. Retornar comprobante creado
      return await tx.comprobanteElectronico.findUnique({
        where: { id: comprobante.id },
        include: {
          preFactura: true,
          empresa: true,
          entidadComercial: true,
          moneda: true,
          detalles: {
            include: {
              producto: true
            }
          }
        }
      });
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Genera una Boleta Electrónica desde una PreFactura
 */
const generarBoletaDesdePreFactura = async (preFacturaId, datosBoleta = {}) => {
  try {
    // 1. Obtener PreFactura con detalles
    const preFactura = await prisma.preFactura.findUnique({
      where: { id: preFacturaId },
      include: {
        empresa: true,
        cliente: true,
        moneda: true,
        formaPago: true,
        detalles: {
          include: {
            producto: {
              include: {
                unidadMedida: true
              }
            }
          },
          orderBy: { id: 'asc' }
        }
      }
    });

    if (!preFactura) {
      throw new NotFoundError('PreFactura no encontrada');
    }

    if (preFactura.facturado) {
      throw new ConflictError('Esta PreFactura ya fue facturada');
    }

    if (!preFactura.detalles || preFactura.detalles.length === 0) {
      throw new ValidationError('La PreFactura debe tener detalles para generar boleta');
    }

    // 2. Obtener tipo documento Boleta (código 03)
    const tipoBoleta = await prisma.tipoDocumento.findFirst({
      where: { codigo: '03' }
    });

    if (!tipoBoleta) {
      throw new ValidationError('No se encontró el tipo de documento Boleta (código 03)');
    }

    // 3. Obtener serie para boletas
    const serieBoleta = datosBoleta.serieDocId 
      ? await prisma.serieDoc.findUnique({ where: { id: BigInt(datosBoleta.serieDocId) } })
      : await prisma.serieDoc.findFirst({
          where: {
            empresaId: preFactura.empresaId,
            tipoDocumentoId: tipoBoleta.id,
            activo: true
          }
        });

    if (!serieBoleta) {
      throw new ValidationError('No se encontró una serie activa para Boletas');
    }

    // 4. Obtener sede
    const sede = await prisma.sedesEmpresa.findFirst({
      where: {
        empresaId: preFactura.empresaId,
        activo: true
      }
    });

    if (!sede) {
      throw new ValidationError('No se encontró una sede activa para la empresa');
    }

    // 5. Obtener estados
    const estadoOSE = await prisma.estadoMultiFuncion.findFirst({
      where: { codigo: 'OSE_PENDIENTE', modulo: 'COMPROBANTES_ELECTRONICOS' }
    });

    const estadoSUNAT = await prisma.estadoMultiFuncion.findFirst({
      where: { codigo: 'SUNAT_ACTIVO', modulo: 'COMPROBANTES_ELECTRONICOS' }
    });

    if (!estadoOSE || !estadoSUNAT) {
      throw new ValidationError('No se encontraron los estados necesarios para comprobantes');
    }

    // 6. Crear comprobante en transacción
    return await prisma.$transaction(async (tx) => {
      // 6.1. Calcular correlativo
      const nuevoCorrelativo = Number(serieBoleta.correlativo) + 1;
      const numSerie = String(serieBoleta.serie).padStart(serieBoleta.numCerosIzqSerie, '0');
      const numCorre = String(nuevoCorrelativo).padStart(serieBoleta.numCerosIzqCorre, '0');
      const numeroCompleto = `${numSerie}-${numCorre}`;

      // 6.2. Actualizar correlativo
      await tx.serieDoc.update({
        where: { id: serieBoleta.id },
        data: { correlativo: BigInt(nuevoCorrelativo) }
      });

      // 6.3. Crear comprobante electrónico
      const comprobante = await tx.comprobanteElectronico.create({
        data: {
          preFacturaId: preFactura.id,
          empresaId: preFactura.empresaId,
          sedeId: sede.id,
          tipoComprobanteId: tipoBoleta.id,
          serieDocId: serieBoleta.id,
          numeroSerie: numSerie,
          numeroCorrelativo: nuevoCorrelativo,
          numeroCompleto: numeroCompleto,
          fechaEmision: datosBoleta.fechaEmision ? new Date(datosBoleta.fechaEmision) : new Date(),
          horaEmision: new Date().toTimeString().split(' ')[0],
          fechaVencimiento: preFactura.fechaVencimiento,
          entidadComercialId: preFactura.clienteId,
          tipoDocumentoClienteId: preFactura.cliente.tipoDocumentoId,
          numeroDocumentoCliente: preFactura.cliente.numeroDocumento,
          razonSocialCliente: preFactura.cliente.razonSocial,
          direccionCliente: preFactura.cliente.direccion || '',
          emailCliente: preFactura.cliente.email,
          monedaId: preFactura.monedaId,
          tipoCambio: preFactura.tipoCambio,
          formaPagoId: preFactura.formaPagoId,
          estadoOSEId: estadoOSE.id,
          estadoSUNATId: estadoSUNAT.id,
          observaciones: datosBoleta.observaciones || preFactura.observaciones,
          creadoPor: datosBoleta.creadoPor
        }
      });

      // 6.4. Crear detalles del comprobante
      for (const detalle of preFactura.detalles) {
        await tx.detalleComprobante.create({
          data: {
            comprobanteElectronicoId: comprobante.id,
            productoId: detalle.productoId,
            descripcion: detalle.producto?.nombre || '',
            cantidad: detalle.cantidad,
            unidadMedida: detalle.producto?.unidadMedida?.codigo || 'NIU',
            precioUnitario: detalle.precioUnitario || 0,
            valorVenta: Number(detalle.cantidad) * Number(detalle.precioUnitario || 0)
          }
        });
      }

      // 6.5. Actualizar PreFactura
      await tx.preFactura.update({
        where: { id: preFactura.id },
        data: {
          tipoDocumentoFinalId: tipoBoleta.id,
          serieDocFinalId: serieBoleta.id,
          numeroDocumentoFinal: numeroCompleto,
          numSerieDocFinal: numSerie,
          numCorreDocFinal: numCorre,
          facturado: true,
          fechaFacturacion: new Date()
        }
      });

      // 6.6. Retornar comprobante creado
      return await tx.comprobanteElectronico.findUnique({
        where: { id: comprobante.id },
        include: {
          preFactura: true,
          empresa: true,
          entidadComercial: true,
          moneda: true,
          detalles: {
            include: {
              producto: true
            }
          }
        }
      });
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Partir PreFactura en dos: Blanca (Formal) y Negra (Gerencial)
 * Caso 2: Mixto según flujoFacturacion.md
 */
const partirPreFactura = async (preFacturaId, datos) => {
  try {
    const { porcentajeNegro, porcentajeBlanco } = datos;

    // Validar porcentajes
    if (porcentajeNegro + porcentajeBlanco !== 100) {
      throw new ValidationError('La suma de porcentajes debe ser 100%');
    }

    return await prisma.$transaction(async (tx) => {
      // 1. Obtener PreFactura original
      const preFacturaOriginal = await tx.preFactura.findUnique({
        where: { id: preFacturaId },
        include: {
          detalles: {
            include: { producto: true }
          }
        }
      });

      if (!preFacturaOriginal) {
        throw new NotFoundError('PreFactura no encontrada');
      }

      // Validar que esté APROBADA (estado 46)
      if (Number(preFacturaOriginal.estadoId) !== 46) {
        throw new ValidationError('Solo se pueden partir PreFacturas APROBADAS');
      }

      // 2. Calcular montos
      const montoNegro = (Number(preFacturaOriginal.total) * porcentajeNegro) / 100;
      const montoBlanco = (Number(preFacturaOriginal.total) * porcentajeBlanco) / 100;

      // 3. Crear PreFactura NEGRA (Gerencial)
      const codigoNegra = await generarCodigoPreFactura(preFacturaOriginal.empresaId);
      const preFacturaNegra = await tx.preFactura.create({
        data: {
          ...preFacturaOriginal,
          id: undefined,
          codigo: codigoNegra,
          esGerencial: true,
          esParticionada: false,
          preFacturaOrigenId: preFacturaOriginal.id,
          total: montoNegro,
          subtotal: montoNegro / (1 + (Number(preFacturaOriginal.porcentajeIGV) || 0) / 100),
          totalIGV: preFacturaOriginal.exoneradoIgv ? 0 : montoNegro - (montoNegro / (1 + (Number(preFacturaOriginal.porcentajeIGV) || 0) / 100)),
          observaciones: `Parte NEGRA (${porcentajeNegro}%) de ${preFacturaOriginal.codigo}`,
          facturado: false,
          fechaFacturacion: null
        }
      });

      // 4. Crear PreFactura BLANCA (Formal)
      const codigoBlanca = await generarCodigoPreFactura(preFacturaOriginal.empresaId);
      const preFacturaBlanca = await tx.preFactura.create({
        data: {
          ...preFacturaOriginal,
          id: undefined,
          codigo: codigoBlanca,
          esGerencial: false,
          esParticionada: false,
          preFacturaOrigenId: preFacturaOriginal.id,
          total: montoBlanco,
          subtotal: montoBlanco / (1 + (Number(preFacturaOriginal.porcentajeIGV) || 0) / 100),
          totalIGV: preFacturaOriginal.exoneradoIgv ? 0 : montoBlanco - (montoBlanco / (1 + (Number(preFacturaOriginal.porcentajeIGV) || 0) / 100)),
          observaciones: `Parte BLANCA (${porcentajeBlanco}%) de ${preFacturaOriginal.codigo}`,
          facturado: false,
          fechaFacturacion: null
        }
      });

      // 5. Copiar detalles proporcionalmente
      for (const detalle of preFacturaOriginal.detalles) {
        const cantidadNegra = (Number(detalle.cantidad) * porcentajeNegro) / 100;
        const cantidadBlanca = (Number(detalle.cantidad) * porcentajeBlanco) / 100;

        // Detalle para PreFactura Negra
        await tx.detallePreFactura.create({
          data: {
            preFacturaId: preFacturaNegra.id,
            productoId: detalle.productoId,
            cantidad: cantidadNegra,
            precioUnitario: detalle.precioUnitario,
            descripcion: detalle.descripcion
          }
        });

        // Detalle para PreFactura Blanca
        await tx.detallePreFactura.create({
          data: {
            preFacturaId: preFacturaBlanca.id,
            productoId: detalle.productoId,
            cantidad: cantidadBlanca,
            precioUnitario: detalle.precioUnitario,
            descripcion: detalle.descripcion
          }
        });
      }

      // 6. Actualizar PreFactura original a PARTICIONADA (estado 48)
      await tx.preFactura.update({
        where: { id: preFacturaOriginal.id },
        data: {
          esParticionada: true,
          estadoId: BigInt(48) // Estado PARTICIONADA
        }
      });

      return {
        preFacturaOriginal,
        preFacturaNegra,
        preFacturaBlanca
      };
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Facturar PreFactura Negra (Gerencial) - Caso 1: 100% Negro
 * Genera CuentaPorCobrar sin comprobante electrónico
 */
const facturarPreFacturaNegra = async (preFacturaId) => {
  try {
    return await prisma.$transaction(async (tx) => {
      // 1. Obtener PreFactura
      const preFactura = await tx.preFactura.findUnique({
        where: { id: preFacturaId },
        include: {
          cliente: true,
          moneda: true
        }
      });

      if (!preFactura) {
        throw new NotFoundError('PreFactura no encontrada');
      }

      // Validar que esté APROBADA (estado 46)
      if (Number(preFactura.estadoId) !== 46) {
        throw new ValidationError('Solo se pueden facturar PreFacturas APROBADAS');
      }

      // Validar que sea GERENCIAL
      if (!preFactura.esGerencial) {
        throw new ValidationError('Solo se pueden facturar como NEGRA las PreFacturas GERENCIALES');
      }

      // 2. Buscar estado PENDIENTE DE PAGO para CxC (ID 100)
      const estadoPendiente = await tx.estadoMultiFuncion.findFirst({
        where: {
          tipoProvieneDeId: BigInt(24), // Tipo Proviene: CUENTAS POR COBRAR
          nombre: { contains: 'PENDIENTE', mode: 'insensitive' }
        }
      });

      if (!estadoPendiente) {
        throw new ValidationError('No se encontró el estado PENDIENTE para CuentaPorCobrar');
      }

      // 3. Crear CuentaPorCobrar NEGRA (Gerencial)
      const cuentaPorCobrar = await tx.cuentaPorCobrar.create({
        data: {
          preFacturaId: preFactura.id,
          empresaId: preFactura.empresaId,
          clienteId: preFactura.clienteId,
          numeroPreFactura: preFactura.codigo,
          fechaEmision: new Date(),
          fechaVencimiento: preFactura.fechaVencimiento || new Date(),
          montoTotal: preFactura.total,
          montoPagado: 0,
          saldoPendiente: preFactura.total,
          esSaldoInicial: false,
          esGerencial: true, // NEGRA
          monedaId: preFactura.monedaId,
          esContado: preFactura.esContado || false,
          estadoId: estadoPendiente.id,
          observaciones: `CxC Negra generada desde PreFactura ${preFactura.codigo}`
        }
      });

      // 4. Actualizar PreFactura a FACTURADA (estado 95)
      await tx.preFactura.update({
        where: { id: preFactura.id },
        data: {
          facturado: true,
          fechaFacturacion: new Date(),
          estadoId: BigInt(95) // Estado FACTURADA
        }
      });

      return {
        preFactura,
        cuentaPorCobrar
      };
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};
/**
 * Anular una PreFactura
 * Si tiene movimiento de almacén asociado, lo elimina
 */
const anular = async (id) => {
  return await prisma.$transaction(async (tx) => {
    try {
      // 1. Obtener la PreFactura
      const preFactura = await tx.preFactura.findUnique({
        where: { id },
        include: { detalles: true }
      });

      if (!preFactura) throw new NotFoundError('PreFactura no encontrada');
      
      // Verificar si ya está anulada (estadoId 40 = ANULADO)
      if (Number(preFactura.estadoId) === 40) {
        throw new ValidationError('La PreFactura ya está anulada');
      }

      // 2. Si tiene movimiento de almacén, eliminarlo
      if (preFactura.movSalidaAlmacenId) {
        const { default: eliminarMovimientoAlmacenService } =
          await import('../Almacen/eliminarMovimientoAlmacen.service.js');

        await eliminarMovimientoAlmacenService.eliminarMovimientoAlmacenCompleto(
          preFactura.movSalidaAlmacenId,
          tx
        );
      }

      // 3. Actualizar PreFactura a estado ANULADO
      const anulada = await tx.preFactura.update({
        where: { id },
        data: {
          estadoId: BigInt(40), // ANULADO
          movSalidaAlmacenId: null,
          fechaActualizacion: new Date(),
        },
        include: {
          empresa: true,
          cliente: true,
          tipoDocumento: true,
          moneda: true,
          detalles: {
            include: {
              producto: true,
            },
          },
        },
      });

      return anulada;
    } catch (err) {
      if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
      if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
      throw err;
    }
  });
};

export default {
  listar,
  obtenerPorId,
  obtenerPorCliente,
  obtenerPorCotizacion,
  crear,
  actualizar,
  eliminar,
  generarFacturaDesdePreFactura,
  generarBoletaDesdePreFactura,
  partirPreFactura,
  facturarPreFacturaNegra,
  anular,
};