import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para EntregaARendirContratoServicios
 * Valida existencia de claves foráneas y previene borrado si tiene movimientos asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  // Convertir a BigInt para la búsqueda en Prisma
  const contratoId = BigInt(data.contratoServicioId);
  const responsableId = BigInt(data.respEntregaRendirId);
  const centroCostoIdBigInt = BigInt(data.centroCostoId);

  const [contrato, responsable, centroCosto] = await Promise.all([
    prisma.contratoServicio.findUnique({ where: { id: contratoId } }),
    prisma.personal ? prisma.personal.findUnique({ where: { id: responsableId } }) : Promise.resolve(true),
    prisma.centroCosto ? prisma.centroCosto.findUnique({ where: { id: centroCostoIdBigInt } }) : Promise.resolve(true)
  ]);
  if (!contrato) throw new ValidationError('El contratoServicioId no existe.');
  if (prisma.personal && !responsable) throw new ValidationError('El respEntregaRendirId no existe.');
  if (prisma.centroCosto && !centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.entregaARendirContratoServicios.findMany({
      include: {
        contratoServicio: {
          include: {
            cliente: true,
            empresa: true
          }
        },
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true,          // Centro de costo
        detallesMovimientos: {
          include: {
            tipoMovimiento: true,
            producto: true,
            moneda: true,
            entidadComercial: true,
            tipoDocumento: true,
            responsable: true
          },
          orderBy: { fechaMovimiento: 'desc' }
        }
      },
      orderBy: { fechaCreacion: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const entrega = await prisma.entregaARendirContratoServicios.findUnique({ 
      where: { id },
      include: {
        contratoServicio: {
          include: {
            cliente: true,
            empresa: true,
            sede: true
          }
        },
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true,          // Centro de costo
        detallesMovimientos: {
          include: {
            tipoMovimiento: true,
            producto: true,
            moneda: true,
            entidadComercial: true,
            tipoDocumento: true,
            responsable: true,
            centroCosto: true
          },
          orderBy: { fechaMovimiento: 'desc' }
        }
      }
    });
    if (!entrega) throw new NotFoundError('EntregaARendirContratoServicios no encontrada');
    return entrega;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorContrato = async (contratoServicioId) => {
  try {
    const entrega = await prisma.entregaARendirContratoServicios.findUnique({ 
      where: { contratoServicioId },
      include: {
        contratoServicio: {
          include: {
            cliente: true,
            empresa: true,
            sede: true
          }
        },
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true,          // Centro de costo
        detallesMovimientos: {
          include: {
            tipoMovimiento: true,
            producto: true,
            moneda: true,
            entidadComercial: true,
            tipoDocumento: true,
            responsable: true,
            centroCosto: true
          },
          orderBy: { fechaMovimiento: 'desc' }
        }
      }
    });
    return entrega;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.contratoServicioId || !data.respEntregaRendirId || !data.centroCostoId) {
      throw new ValidationError('contratoServicioId, respEntregaRendirId y centroCostoId son obligatorios.');
    }
    await validarClavesForaneas(data);
    
    // Crear objeto limpio solo con campos del modelo (patrón estándar)
    const datosLimpios = {
      contratoServicioId: BigInt(data.contratoServicioId),
      respEntregaRendirId: BigInt(data.respEntregaRendirId),
      centroCostoId: BigInt(data.centroCostoId),
      entregaLiquidada: data.entregaLiquidada !== undefined ? data.entregaLiquidada : false,
      fechaLiquidacion: data.fechaLiquidacion,
      respLiquidacionId: data.respLiquidacionId ? BigInt(data.respLiquidacionId) : null,
      urlLiquidacionPdf: data.urlLiquidacionPdf,
      fechaCreacion: data.fechaCreacion || new Date(),
      fechaActualizacion: data.fechaActualizacion || new Date(),
      creadoPor: data.creadoPor ? BigInt(data.creadoPor) : null,
      actualizadoPor: data.actualizadoPor ? BigInt(data.actualizadoPor) : null,
    };
    
    return await prisma.entregaARendirContratoServicios.create({ 
      data: datosLimpios,
      include: {
        contratoServicio: {
          include: {
            cliente: true,
            empresa: true
          }
        },
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true,          // Centro de costo
        detallesMovimientos: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.entregaARendirContratoServicios.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('EntregaARendirContratoServicios no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['contratoServicioId','respEntregaRendirId','centroCostoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    
    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaCreacion: data.fechaCreacion || existente.fechaCreacion || new Date(),
      creadoPor: data.creadoPor || existente.creadoPor || null,
      fechaActualizacion: data.fechaActualizacion || new Date(),
      actualizadoPor: data.actualizadoPor || existente.actualizadoPor || null,
    };
    
    return await prisma.entregaARendirContratoServicios.update({ 
      where: { id }, 
      data: datosConAuditoria,
      include: {
        contratoServicio: {
          include: {
            cliente: true,
            empresa: true
          }
        },
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true,          // Centro de costo
        detallesMovimientos: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.entregaARendirContratoServicios.findUnique({
      where: { id },
      include: { detallesMovimientos: true }
    });
    if (!existente) throw new NotFoundError('EntregaARendirContratoServicios no encontrada');
    if (existente.detallesMovimientos && existente.detallesMovimientos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene movimientos asociados.');
    }
    await prisma.entregaARendirContratoServicios.delete({ where: { id } });
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
  obtenerPorContrato,
  crear,
  actualizar,
  eliminar
};
