import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para EntregaARendirPVentas
 * Valida existencia de claves foráneas y previene borrado si tiene movimientos asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [cotizacion, responsable, centroCosto] = await Promise.all([
    prisma.cotizacionVentas.findUnique({ where: { id: data.cotizacionVentasId } }),
    prisma.personal ? prisma.personal.findUnique({ where: { id: data.respEntregaRendirId } }) : Promise.resolve(true),
    prisma.centroCosto ? prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }) : Promise.resolve(true)
  ]);
  if (!cotizacion) throw new ValidationError('El cotizacionVentasId no existe.');
  if (prisma.personal && !responsable) throw new ValidationError('El respEntregaRendirId no existe.');
  if (prisma.centroCosto && !centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.entregaARendirPVentas.findMany({
      include: {
        cotizacionVentas: true,
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true,          // Centro de costo
        movimientos: {
          include: {
            tipoMovimiento: true,
            producto: true,
            moneda: true,
            entidadComercial: true,
            tipoDocumento: true
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
    const entrega = await prisma.entregaARendirPVentas.findUnique({ 
      where: { id },
      include: {
        cotizacionVentas: true,
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true,          // Centro de costo
        movimientos: {
          include: {
            tipoMovimiento: true,
            producto: true,
            moneda: true,
            entidadComercial: true,
            tipoDocumento: true
          },
          orderBy: { fechaMovimiento: 'desc' }
        }
      }
    });
    if (!entrega) throw new NotFoundError('EntregaARendirPVentas no encontrada');
    return entrega;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorCotizacion = async (cotizacionVentasId) => {
  try {
    const entrega = await prisma.entregaARendirPVentas.findUnique({ 
      where: { cotizacionVentasId },
      include: {
        cotizacionVentas: true,
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true,          // Centro de costo
        movimientos: {
          include: {
            tipoMovimiento: true,
            producto: true,
            moneda: true,
            entidadComercial: true,
            tipoDocumento: true
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
    if (!data.cotizacionVentasId || !data.respEntregaRendirId || !data.centroCostoId) {
      throw new ValidationError('cotizacionVentasId, respEntregaRendirId y centroCostoId son obligatorios.');
    }
    await validarClavesForaneas(data);
    
    // Asegurar campos de auditoría y campos opcionales explícitos
    const datosConAuditoria = {
      ...data,
      entregaLiquidada: data.entregaLiquidada || false,
      fechaLiquidacion: data.fechaLiquidacion || null,
      respLiquidacionId: data.respLiquidacionId || null,
      urlLiquidacionPdf: data.urlLiquidacionPdf || null,
      fechaCreacion: data.fechaCreacion || new Date(),
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };
    
    return await prisma.entregaARendirPVentas.create({ 
      data: datosConAuditoria,
      include: {
        cotizacionVentas: true,
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true,          // Centro de costo
        movimientos: true
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
    const existente = await prisma.entregaARendirPVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('EntregaARendirPVentas no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['cotizacionVentasId','respEntregaRendirId','centroCostoId'];
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
    
    return await prisma.entregaARendirPVentas.update({ 
      where: { id }, 
      data: datosConAuditoria,
      include: {
        cotizacionVentas: true,
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true,          // Centro de costo
        movimientos: true
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
    const existente = await prisma.entregaARendirPVentas.findUnique({
      where: { id },
      include: { movimientos: true }
    });
    if (!existente) throw new NotFoundError('EntregaARendirPVentas no encontrada');
    if (existente.movimientos && existente.movimientos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene movimientos asociados.');
    }
    await prisma.entregaARendirPVentas.delete({ where: { id } });
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
  obtenerPorCotizacion,
  crear,
  actualizar,
  eliminar
};
