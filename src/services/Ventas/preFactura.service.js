import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

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
    data.cotizacionVentaId ? prisma.cotizacionVentas.findUnique({ where: { id: data.cotizacionVentaId } }) : Promise.resolve(true),
    data.movSalidaAlmacenId ? prisma.movimientoAlmacen.findUnique({ where: { id: data.movSalidaAlmacenId } }) : Promise.resolve(true),
    data.paisDestinoId ? prisma.pais.findUnique({ where: { id: data.paisDestinoId } }) : Promise.resolve(true),
    data.puertoEmbarqueId ? prisma.puertoPesca.findUnique({ where: { id: data.puertoEmbarqueId } }) : Promise.resolve(true),
    data.puertoDestinoId ? prisma.puertoPesca.findUnique({ where: { id: data.puertoDestinoId } }) : Promise.resolve(true),
    data.incotermId ? prisma.incoterm.findUnique({ where: { id: data.incotermId } }) : Promise.resolve(true),
    data.agenteAduanaId ? prisma.entidadComercial.findUnique({ where: { id: data.agenteAduanaId } }) : Promise.resolve(true),
    data.bancoId ? prisma.banco.findUnique({ where: { id: data.bancoId } }) : Promise.resolve(true),
    data.monedaId ? prisma.moneda.findUnique({ where: { id: data.monedaId } }) : Promise.resolve(true),
    data.centroCostoId ? prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }) : Promise.resolve(true)
  ];
  const [empresa, cliente, tipoDoc, formaPago, estado, serieDoc, cotizacion, movSalida, paisDestino, puertoEmbarque, puertoDestino, incoterm, agenteAduana, banco, moneda, centroCosto] = await Promise.all(checks);
  
  if (!empresa) throw new ValidationError('El empresaId no existe.');
  if (!cliente) throw new ValidationError('El clienteId no existe.');
  if (!tipoDoc) throw new ValidationError('El tipoDocumentoId no existe.');
  if (!formaPago) throw new ValidationError('El formaPagoId no existe.');
  if (!estado) throw new ValidationError('El estadoId no existe.');
  if (data.serieDocId && !serieDoc) throw new ValidationError('El serieDocId no existe.');
  if (data.cotizacionVentaId && !cotizacion) throw new ValidationError('El cotizacionVentaId no existe.');
  if (data.movSalidaAlmacenId && !movSalida) throw new ValidationError('El movSalidaAlmacenId no existe.');
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

      // 10. Extraer y remover campos de relaciones anidadas
      const { detalles, ...dataSinRelaciones } = data;

      // 11. Asegurar campos de auditoría
      const datosConAuditoria = {
        ...dataSinRelaciones,
        codigo,
        numSerieDoc: numSerie,
        numCorreDoc: numCorre,
        numeroDocumento,
        fechaVencimiento,
        fechaCreacion: data.fechaCreacion || new Date(),
        fechaActualizacion: data.fechaActualizacion || new Date(),
      };

      // 12. Crear la pre-factura con los números generados
      return await tx.preFactura.create({
        data: datosConAuditoria,
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
    const claves = ['empresaId','clienteId','tipoDocumentoId','formaPagoId','estadoId','serieDocId','cotizacionVentaId','movSalidaAlmacenId','paisDestinoId','puertoEmbarqueId','puertoDestinoId','incotermId','agenteAduanaId','bancoId','monedaId','centroCostoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
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

export default {
  listar,
  obtenerPorId,
  obtenerPorCliente,
  obtenerPorCotizacion,
  crear,
  actualizar,
  eliminar,
  generarFacturaDesdePreFactura,
  generarBoletaDesdePreFactura
};