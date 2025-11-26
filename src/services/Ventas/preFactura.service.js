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
    data.cotizacionVentasOrigenId ? prisma.cotizacionVentas.findUnique({ where: { id: data.cotizacionVentasOrigenId } }) : Promise.resolve(true),
    data.movSalidaAlmacenId ? prisma.movimientoAlmacen.findUnique({ where: { id: data.movSalidaAlmacenId } }) : Promise.resolve(true),
    data.paisDestinoId ? prisma.pais.findUnique({ where: { id: data.paisDestinoId } }) : Promise.resolve(true),
    data.puertoCargaId ? prisma.puertoPesca.findUnique({ where: { id: data.puertoCargaId } }) : Promise.resolve(true),
    data.puertoDescargaId ? prisma.puertoPesca.findUnique({ where: { id: data.puertoDescargaId } }) : Promise.resolve(true),
    data.incotermId ? prisma.incoterm.findUnique({ where: { id: data.incotermId } }) : Promise.resolve(true),
    data.agenteAduanaId ? prisma.entidadComercial.findUnique({ where: { id: data.agenteAduanaId } }) : Promise.resolve(true),
    data.bancoId ? prisma.banco.findUnique({ where: { id: data.bancoId } }) : Promise.resolve(true),
    data.monedaId ? prisma.moneda.findUnique({ where: { id: data.monedaId } }) : Promise.resolve(true),
    data.centroCostoId ? prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }) : Promise.resolve(true)
  ];
  const [empresa, cliente, tipoDoc, formaPago, estado, serieDoc, cotizacion, movSalida, paisDestino, puertoCarga, puertoDescarga, incoterm, agenteAduana, banco, moneda, centroCosto] = await Promise.all(checks);
  
  if (!empresa) throw new ValidationError('El empresaId no existe.');
  if (!cliente) throw new ValidationError('El clienteId no existe.');
  if (!tipoDoc) throw new ValidationError('El tipoDocumentoId no existe.');
  if (!formaPago) throw new ValidationError('El formaPagoId no existe.');
  if (!estado) throw new ValidationError('El estadoId no existe.');
  if (data.serieDocId && !serieDoc) throw new ValidationError('El serieDocId no existe.');
  if (data.cotizacionVentasOrigenId && !cotizacion) throw new ValidationError('El cotizacionVentasOrigenId no existe.');
  if (data.movSalidaAlmacenId && !movSalida) throw new ValidationError('El movSalidaAlmacenId no existe.');
  if (data.paisDestinoId && !paisDestino) throw new ValidationError('El paisDestinoId no existe.');
  if (data.puertoCargaId && !puertoCarga) throw new ValidationError('El puertoCargaId no existe.');
  if (data.puertoDescargaId && !puertoDescarga) throw new ValidationError('El puertoDescargaId no existe.');
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

const obtenerPorCotizacion = async (cotizacionVentasOrigenId) => {
  try {
    return await prisma.preFactura.findMany({
      where: { cotizacionVentasOrigenId },
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
    const claves = ['empresaId','clienteId','tipoDocumentoId','formaPagoId','estadoId','serieDocId','cotizacionVentasOrigenId','movSalidaAlmacenId','paisDestinoId','puertoCargaId','puertoDescargaId','incotermId','agenteAduanaId','bancoId','monedaId','centroCostoId'];
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

export default {
  listar,
  obtenerPorId,
  obtenerPorCliente,
  obtenerPorCotizacion,
  crear,
  actualizar,
  eliminar
};
