// src/services/Compras/entregaARendirPCompras.service.js
// Servicio CRUD para EntregaARendirPCompras
// Valida existencia de claves foráneas y previene borrado si tiene movimientos asociados.
// Documentado en español.

import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

async function validarClavesForaneas(data) {
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
          include: {
            empresa: true,
            centroCosto: true,
          },
        },
        movimientos: {
          include: {
            tipoMovimiento: true,
            entidadComercial: true,
            moneda: true,
            tipoDocumento: true,
          },
          orderBy: {
            fechaMovimiento: 'desc',
          },
        },
      },
      orderBy: {
        fechaCreacion: 'desc',
      },
    });
  } catch (err) {
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
          include: {
            empresa: true,
            centroCosto: true,
            cotizacionCompra: true,
          },
        },
        movimientos: {
          include: {
            tipoMovimiento: true,
            entidadComercial: true,
            moneda: true,
            tipoDocumento: true,
          },
          orderBy: {
            fechaMovimiento: 'desc',
          },
        },
      },
    });
    if (!entrega) throw new NotFoundError('EntregaARendirPCompras no encontrada');
    return entrega;
  } catch (err) {
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
        fechaActualizacion: new Date(),
        creadoPor: data.creadoPor || null,
        actualizadoPor: data.actualizadoPor || null,
      },
      include: {
        requerimientoCompra: {
          include: {
            empresa: true,
            centroCosto: true,
          },
        },
      },
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  const existe = await prisma.entregaARendirPCompras.findUnique({ where: { id } });
  if (!existe) throw new NotFoundError('EntregaARendirPCompras no encontrada');
  
  // Si se está cambiando el requerimientoCompraId, validar que no exista otra entrega con ese requerimiento
  if (data.requerimientoCompraId && data.requerimientoCompraId !== existe.requerimientoCompraId) {
    const otraEntrega = await prisma.entregaARendirPCompras.findUnique({
      where: { requerimientoCompraId: data.requerimientoCompraId },
    });
    if (otraEntrega) {
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
        fechaActualizacion: new Date(),
        actualizadoPor: data.actualizadoPor || null,
      },
      include: {
        requerimientoCompra: {
          include: {
            empresa: true,
            centroCosto: true,
          },
        },
        movimientos: {
          include: {
            tipoMovimiento: true,
            entidadComercial: true,
            moneda: true,
            tipoDocumento: true,
          },
        },
      },
    });
  } catch (err) {
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