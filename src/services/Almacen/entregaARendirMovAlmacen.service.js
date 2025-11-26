// src/services/Almacen/entregaARendirMovAlmacen.service.js
// Servicio CRUD para EntregaARendirMovAlmacen
// Valida existencia de claves foráneas y previene borrado si tiene movimientos asociados.
// Documentado en español.

import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

async function validarClavesForaneas(data) {
  // Validar que los IDs no sean undefined o null
  if (!data.movimientoAlmacenId) {
    throw new ValidationError('El movimientoAlmacenId es requerido.');
  }
  if (!data.respEntregaRendirId) {
    throw new ValidationError('El respEntregaRendirId es requerido.');
  }
  if (!data.centroCostoId) {
    throw new ValidationError('El centroCostoId es requerido.');
  }

  const [movimiento, responsable, centroCosto] = await Promise.all([
    prisma.movimientoAlmacen.findUnique({ where: { id: data.movimientoAlmacenId } }),
    prisma.personal.findUnique({ where: { id: data.respEntregaRendirId } }),
    prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } })
  ]);
  if (!movimiento) throw new ValidationError('El movimientoAlmacenId no existe.');
  if (!responsable) throw new ValidationError('El respEntregaRendirId no existe.');
  if (!centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.entregaARendirMovAlmacen.findMany({
      include: {
        movimientoAlmacen: {
          select: {
            id: true,
            numeroDocumento: true,
            fechaDocumento: true,
            empresaId: true,
            conceptoMovAlmacenId: true,
            estadoDocAlmacenId: true,
          },
        },
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true           // Centro de costo
      },
      orderBy: {
        fechaCreacion: 'desc',
      },
    });
  } catch (err) {
    console.error('Error en listar EntregaARendirMovAlmacen:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const entrega = await prisma.entregaARendirMovAlmacen.findUnique({ 
      where: { id },
      include: {
        movimientoAlmacen: {
          select: {
            id: true,
            numeroDocumento: true,
            fechaDocumento: true,
            empresaId: true,
            conceptoMovAlmacenId: true,
            estadoDocAlmacenId: true,
            observaciones: true,
          },
        },
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true           // Centro de costo
      },
    });
    if (!entrega) throw new NotFoundError('EntregaARendirMovAlmacen no encontrada');
    return entrega;
  } catch (err) {
    console.error('Error en obtenerPorId EntregaARendirMovAlmacen:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  await validarClavesForaneas(data);
  
  // Verificar que no exista ya una entrega para este movimiento de almacén (relación 1:1)
  const existente = await prisma.entregaARendirMovAlmacen.findUnique({
    where: { movimientoAlmacenId: data.movimientoAlmacenId },
  });
  
  if (existente) {
    throw new ConflictError('Ya existe una entrega a rendir para este movimiento de almacén');
  }
  
  try {
    return await prisma.entregaARendirMovAlmacen.create({
      data: {
        movimientoAlmacenId: data.movimientoAlmacenId,
        respEntregaRendirId: data.respEntregaRendirId,
        centroCostoId: data.centroCostoId,
        entregaLiquidada: data.entregaLiquidada || false,
        fechaLiquidacion: data.fechaLiquidacion || null,
        respLiquidacionId: data.respLiquidacionId || null,
        urlLiquidacionPdf: data.urlLiquidacionPdf || null,
        fechaActualizacion: new Date(),
        creadoPor: data.creadoPor || null,
        actualizadoPor: data.actualizadoPor || null,
      },
      include: {
        movimientoAlmacen: {
          select: {
            id: true,
            numeroDocumento: true,
            fechaDocumento: true,
            empresaId: true,
            conceptoMovAlmacenId: true,
            estadoDocAlmacenId: true,
          },
        },
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true           // Centro de costo
      },
    });
  } catch (err) {
    console.error('Error en crear EntregaARendirMovAlmacen:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  const existe = await prisma.entregaARendirMovAlmacen.findUnique({ where: { id } });
  if (!existe) throw new NotFoundError('EntregaARendirMovAlmacen no encontrada');
  
  // Si se está cambiando el movimientoAlmacenId, validar que no exista otra entrega con ese movimiento
  if (data.movimientoAlmacenId && BigInt(data.movimientoAlmacenId) !== BigInt(existe.movimientoAlmacenId)) {
    const otraEntrega = await prisma.entregaARendirMovAlmacen.findUnique({
      where: { movimientoAlmacenId: data.movimientoAlmacenId },
    });
    // Solo lanzar error si existe otra entrega Y no es la misma que estamos actualizando
    if (otraEntrega && BigInt(otraEntrega.id) !== BigInt(id)) {
      throw new ConflictError('Ya existe una entrega a rendir para este movimiento de almacén');
    }
  }
  
  await validarClavesForaneas(data);
  
  try {
    return await prisma.entregaARendirMovAlmacen.update({
      where: { id },
      data: {
        movimientoAlmacenId: data.movimientoAlmacenId,
        respEntregaRendirId: data.respEntregaRendirId,
        centroCostoId: data.centroCostoId,
        entregaLiquidada: data.entregaLiquidada,
        fechaLiquidacion: data.fechaLiquidacion,
        respLiquidacionId: data.respLiquidacionId,
        urlLiquidacionPdf: data.urlLiquidacionPdf,
        fechaActualizacion: new Date(),
        actualizadoPor: data.actualizadoPor || null,
      },
      include: {
        movimientoAlmacen: {
          select: {
            id: true,
            numeroDocumento: true,
            fechaDocumento: true,
            empresaId: true,
            conceptoMovAlmacenId: true,
            estadoDocAlmacenId: true,
          },
        },
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true           // Centro de costo
      },
    });
  } catch (err) {
    console.error('Error en actualizar EntregaARendirMovAlmacen:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  const entrega = await prisma.entregaARendirMovAlmacen.findUnique({
    where: { id },
    include: { detMovEntregaRendirMovAlmacen: true }
  });
  
  if (!entrega) throw new NotFoundError('EntregaARendirMovAlmacen no encontrada');
  
  if (entrega.detMovEntregaRendirMovAlmacen && entrega.detMovEntregaRendirMovAlmacen.length > 0) {
    throw new ConflictError('No se puede eliminar la entrega a rendir porque tiene movimientos asociados');
  }
  
  if (entrega.entregaLiquidada) {
    throw new ConflictError('No se puede eliminar una entrega a rendir que ya está liquidada');
  }
  
  try {
    await prisma.entregaARendirMovAlmacen.delete({ where: { id } });
    return { mensaje: 'EntregaARendirMovAlmacen eliminada correctamente' };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
