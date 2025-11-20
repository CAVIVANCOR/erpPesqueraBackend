// src/services/Compras/entregaARendirPCompras.service.js
// Servicio CRUD para EntregaARendirPCompras
// Valida existencia de claves foráneas y previene borrado si tiene movimientos asociados.
// Documentado en español.

import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

async function validarClavesForaneas(data) {
  // Validar que los IDs no sean undefined o null
  if (!data.requerimientoCompraId) {
    throw new ValidationError('El requerimientoCompraId es requerido.');
  }
  if (!data.respEntregaRendirId) {
    throw new ValidationError('El respEntregaRendirId es requerido.');
  }
  if (!data.centroCostoId) {
    throw new ValidationError('El centroCostoId es requerido.');
  }

  const [requerimiento, responsable, centroCosto] = await Promise.all([
    prisma.requerimientoCompra.findUnique({ where: { id: data.requerimientoCompraId } }),
    prisma.personal.findUnique({ where: { id: data.respEntregaRendirId } }),
    prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } })
  ]);
  if (!requerimiento) throw new ValidationError('El requerimientoCompraId no existe.');
  if (!responsable) throw new ValidationError('El respEntregaRendirId no existe.');
  if (!centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.entregaARendirPCompras.findMany({
      include: {
        requerimientoCompra: {
          select: {
            id: true,
            numeroDocumento: true,
            fechaDocumento: true,
            empresaId: true,
            centroCostoId: true,
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
    console.error('Error en listar EntregaARendirPCompras:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const entrega = await prisma.entregaARendirPCompras.findUnique({ 
      where: { id },
      include: {
        requerimientoCompra: {
          select: {
            id: true,
            numeroDocumento: true,
            fechaDocumento: true,
            empresaId: true,
            centroCostoId: true,
          },
        },
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true           // Centro de costo
      },
    });
    if (!entrega) throw new NotFoundError('EntregaARendirPCompras no encontrada');
    return entrega;
  } catch (err) {
    console.error('Error en obtenerPorId EntregaARendirPCompras:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  await validarClavesForaneas(data);
  
  // Verificar que no exista ya una entrega para este requerimiento (relación 1:1)
  const existente = await prisma.entregaARendirPCompras.findUnique({
    where: { requerimientoCompraId: data.requerimientoCompraId },
  });
  
  if (existente) {
    throw new ConflictError('Ya existe una entrega a rendir para este requerimiento de compra');
  }
  
  try {
    return await prisma.entregaARendirPCompras.create({
      data: {
        requerimientoCompraId: data.requerimientoCompraId,
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
        requerimientoCompra: {
          select: {
            id: true,
            numeroDocumento: true,
            fechaDocumento: true,
            empresaId: true,
            centroCostoId: true,
          },
        },
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true           // Centro de costo
      },
    });
  } catch (err) {
    console.error('Error en crear EntregaARendirPCompras:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  const existe = await prisma.entregaARendirPCompras.findUnique({ where: { id } });
  if (!existe) throw new NotFoundError('EntregaARendirPCompras no encontrada');
  
  // Si se está cambiando el requerimientoCompraId, validar que no exista otra entrega con ese requerimiento
  if (data.requerimientoCompraId && BigInt(data.requerimientoCompraId) !== BigInt(existe.requerimientoCompraId)) {
    const otraEntrega = await prisma.entregaARendirPCompras.findUnique({
      where: { requerimientoCompraId: data.requerimientoCompraId },
    });
    // Solo lanzar error si existe otra entrega Y no es la misma que estamos actualizando
    if (otraEntrega && BigInt(otraEntrega.id) !== BigInt(id)) {
      throw new ConflictError('Ya existe una entrega a rendir para este requerimiento de compra');
    }
  }
  
  await validarClavesForaneas(data);
  
  try {
    return await prisma.entregaARendirPCompras.update({
      where: { id },
      data: {
        requerimientoCompraId: data.requerimientoCompraId,
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
        requerimientoCompra: {
          select: {
            id: true,
            numeroDocumento: true,
            fechaDocumento: true,
            empresaId: true,
            centroCostoId: true,
          },
        },
        respLiquidacion: true,      // Personal que aprobó la liquidación
        respEntregaRendir: true,    // Personal responsable de la entrega
        centroCosto: true           // Centro de costo
      },
    });
  } catch (err) {
    console.error('Error en actualizar EntregaARendirPCompras:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  const entrega = await prisma.entregaARendirPCompras.findUnique({
    where: { id },
    include: { movimientos: true }
  });
  
  if (!entrega) throw new NotFoundError('EntregaARendirPCompras no encontrada');
  
  if (entrega.movimientos && entrega.movimientos.length > 0) {
    throw new ConflictError('No se puede eliminar la entrega a rendir porque tiene movimientos asociados');
  }
  
  if (entrega.entregaLiquidada) {
    throw new ConflictError('No se puede eliminar una entrega a rendir que ya está liquidada');
  }
  
  try {
    await prisma.entregaARendirPCompras.delete({ where: { id } });
    return { mensaje: 'EntregaARendirPCompras eliminada correctamente' };
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