// c:\Proyectos\megui\erp\erp-pesquera-backend\src\services\Mantenimiento\entregaARendirOTMantenimiento.service.js

import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para EntregaARendirOTMantenimiento
 * Replicado fielmente del patrón de EntregaARendirMovAlmacen
 */

const listar = async () => {
  try {
    return await prisma.entregaARendirOTMantenimiento.findMany({
      include: {
        otMantenimiento: {
          include: {
            activo: true,
            empresa: true,
            responsable: true
          }
        },
        respEntregaRendir: true,
        respLiquidacion: true,
        centroCosto: true,
        detallesMovimientos: {
          include: {
            tipoMovimiento: true,
            responsable: true,
            producto: true,
            moneda: true,
            entidadComercial: true,
            tipoDocumento: true,
            centroCosto: true
          }
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
    const entrega = await prisma.entregaARendirOTMantenimiento.findUnique({
      where: { id },
      include: {
        otMantenimiento: {
          include: {
            activo: true,
            empresa: true,
            responsable: true
          }
        },
        respEntregaRendir: true,
        respLiquidacion: true,
        centroCosto: true,
        detallesMovimientos: {
          include: {
            tipoMovimiento: true,
            responsable: true,
            producto: true,
            moneda: true,
            entidadComercial: true,
            tipoDocumento: true,
            centroCosto: true
          }
        }
      }
    });
    if (!entrega) throw new NotFoundError('EntregaARendirOTMantenimiento no encontrada');
    return entrega;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorOTMantenimiento = async (otMantenimientoId) => {
  try {
    return await prisma.entregaARendirOTMantenimiento.findUnique({
      where: { otMantenimientoId },
      include: {
        otMantenimiento: {
          include: {
            activo: true,
            empresa: true,
            responsable: true
          }
        },
        respEntregaRendir: true,
        respLiquidacion: true,
        centroCosto: true,
        detallesMovimientos: {
          include: {
            tipoMovimiento: true,
            responsable: true,
            producto: true,
            moneda: true,
            entidadComercial: true,
            tipoDocumento: true,
            centroCosto: true
          }
        }
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.otMantenimientoId || !data.respEntregaRendirId || !data.centroCostoId) {
      throw new ValidationError('Campos obligatorios faltantes: otMantenimientoId, respEntregaRendirId, centroCostoId');
    }

    // Validar que la OT existe
    const ot = await prisma.oTMantenimiento.findUnique({ where: { id: data.otMantenimientoId } });
    if (!ot) throw new ValidationError('La OT de Mantenimiento no existe');

    // Validar que no exista ya una entrega para esta OT
    const existente = await prisma.entregaARendirOTMantenimiento.findUnique({
      where: { otMantenimientoId: data.otMantenimientoId }
    });
    if (existente) throw new ValidationError('Ya existe una entrega a rendir para esta OT de Mantenimiento');

    const datosConAuditoria = {
      ...data,
      entregaLiquidada: data.entregaLiquidada || false,
      fechaCreacion: data.fechaCreacion || new Date(),
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };

    return await prisma.entregaARendirOTMantenimiento.create({
      data: datosConAuditoria,
      include: {
        otMantenimiento: {
          include: {
            activo: true,
            empresa: true,
            responsable: true
          }
        },
        respEntregaRendir: true,
        respLiquidacion: true,
        centroCosto: true,
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
    const existente = await prisma.entregaARendirOTMantenimiento.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('EntregaARendirOTMantenimiento no encontrada');

    const datosConAuditoria = {
      ...data,
      fechaActualizacion: new Date(),
    };

    return await prisma.entregaARendirOTMantenimiento.update({
      where: { id },
      data: datosConAuditoria,
      include: {
        otMantenimiento: {
          include: {
            activo: true,
            empresa: true,
            responsable: true
          }
        },
        respEntregaRendir: true,
        respLiquidacion: true,
        centroCosto: true,
        detallesMovimientos: {
          include: {
            tipoMovimiento: true,
            responsable: true,
            producto: true,
            moneda: true,
            entidadComercial: true,
            tipoDocumento: true,
            centroCosto: true
          }
        }
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
    const existente = await prisma.entregaARendirOTMantenimiento.findUnique({
      where: { id },
      include: { detallesMovimientos: true }
    });
    if (!existente) throw new NotFoundError('EntregaARendirOTMantenimiento no encontrada');

    // Validar que no tenga movimientos
    if (existente.detallesMovimientos && existente.detallesMovimientos.length > 0) {
      throw new ValidationError('No se puede eliminar una entrega a rendir que tiene movimientos registrados');
    }

    await prisma.entregaARendirOTMantenimiento.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerPorOTMantenimiento,
  crear,
  actualizar,
  eliminar
};