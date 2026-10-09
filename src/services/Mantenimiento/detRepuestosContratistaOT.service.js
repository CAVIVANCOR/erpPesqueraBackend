import prisma from '../../config/prismaClient.js';
import documentoCompraPresupuestoService from './documentoCompraPresupuesto.service.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetRepuestosContratistaOT
 * Documentado en español.
 */

async function validarForaneas(data) {
  if (data.detContratistaOTId) {
    const detContratista = await prisma.detContratistasOT.findUnique({ 
      where: { id: data.detContratistaOTId } 
    });
    if (!detContratista) throw new ValidationError('El detalle de contratista referenciado no existe.');
  }
  
  if (data.productoId) {
    const producto = await prisma.producto.findUnique({ 
      where: { id: data.productoId } 
    });
    if (!producto) throw new ValidationError('El producto referenciado no existe.');
  }
  
  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ 
      where: { id: data.monedaId } 
    });
    if (!moneda) throw new ValidationError('La moneda referenciada no existe.');
  }
  
}

const listar = async (detContratistaOTId) => {
  try {
    const where = {};
    if (detContratistaOTId) {
      where.detContratistaOTId = BigInt(detContratistaOTId);
    }
    
    return await prisma.detRepuestosContratistaOT.findMany({ 
      where,
      include: { 
        detContratistaOT: {
          select: {
            id: true,
            numeroLinea: true,
            servicioDescripcion: true,
            contratista: {
              select: {
                id: true,
                razonSocial: true
              }
            }
          }
        },
        producto: {
          select: {
            id: true,
            codigo: true,
            descripcionBase: true,
            descripcionArmada: true,
            unidadMedida: {
              select: {
                id: true,
                simbolo: true
              }
            }
          }
        },
        moneda: {
          select: {
            id: true,
            codigoSunat: true,
            simbolo: true
          }
        }
      },
      orderBy: {
        numeroLinea: 'asc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detRepuestosContratistaOT.findUnique({ 
      where: { id },
      include: { 
        detContratistaOT: {
          include: {
            contratista: true,
            otMantenimiento: true
          }
        },
        producto: {
          include: {
            unidadMedida: true,
            marca: true
          }
        },
        moneda: true
      }
    });
    
    if (!detalle) throw new NotFoundError('DetRepuestosContratistaOT no encontrado');
    return detalle;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.detContratistaOTId || !data.numeroLinea || !data.productoId || 
        !data.descripcion || data.cantidad === undefined || 
        data.precioUnitario === undefined || data.total === undefined || 
        !data.monedaId) {
      throw new ValidationError('Faltan campos obligatorios: detContratistaOTId, numeroLinea, productoId, descripcion, cantidad, precioUnitario, total, monedaId.');
    }
    
    await validarForaneas(data);
    
    // Calcular total si no viene o validar
    const cantidad = Number(data.cantidad);
    const precioUnitario = Number(data.precioUnitario);
    const total = cantidad * precioUnitario;
    
    const nuevo = await prisma.detRepuestosContratistaOT.create({
      data: {
        detContratistaOTId: BigInt(data.detContratistaOTId),
        numeroLinea: Number(data.numeroLinea),
        productoId: BigInt(data.productoId),
        descripcion: data.descripcion,
        cantidad: cantidad,
        precioUnitario: precioUnitario,
        total: total,
        monedaId: BigInt(data.monedaId),
        creadoEn: new Date(),
        actualizadoEn: new Date(),
        creadoPor: data.creadoPor ? BigInt(data.creadoPor) : null,
        actualizadoPor: data.actualizadoPor ? BigInt(data.actualizadoPor) : null
      },
      include: {
        producto: {
          include: {
            unidadMedida: true
          }
        },
        moneda: true
      }
    });
    
    // Recalcular montos del presupuesto (montoPactado = suma de ítems)
    try {
      await documentoCompraPresupuestoService.recalcularMontosPresupuesto(nuevo.detContratistaOTId);
    } catch (e) {
      console.error('No se pudo recalcular montos del presupuesto:', e.message);
    }
    return nuevo;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detRepuestosContratistaOT.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetRepuestosContratistaOT no encontrado');
    
    await validarForaneas(data);
    
    // Recalcular total si se modifican cantidad o precio
    const dataActualizada = { ...data };
    if (data.cantidad !== undefined || data.precioUnitario !== undefined) {
      const cantidad = Number(data.cantidad !== undefined ? data.cantidad : existente.cantidad);
      const precioUnitario = Number(data.precioUnitario !== undefined ? data.precioUnitario : existente.precioUnitario);
      dataActualizada.total = cantidad * precioUnitario;
    }
    
    // Convertir BigInt
    if (dataActualizada.detContratistaOTId) dataActualizada.detContratistaOTId = BigInt(dataActualizada.detContratistaOTId);
    if (dataActualizada.productoId) dataActualizada.productoId = BigInt(dataActualizada.productoId);
    if (dataActualizada.monedaId) dataActualizada.monedaId = BigInt(dataActualizada.monedaId);
    if (dataActualizada.creadoPor) dataActualizada.creadoPor = BigInt(dataActualizada.creadoPor);
    if (dataActualizada.actualizadoPor) dataActualizada.actualizadoPor = BigInt(dataActualizada.actualizadoPor);
    
    dataActualizada.actualizadoEn = new Date();
    
    const actualizado = await prisma.detRepuestosContratistaOT.update({ 
      where: { id }, 
      data: dataActualizada,
      include: {
        producto: {
          include: {
            unidadMedida: true
          }
        },
        moneda: true
      }
    });

    // Recalcular montos del presupuesto
    try {
      await documentoCompraPresupuestoService.recalcularMontosPresupuesto(actualizado.detContratistaOTId);
    } catch (e) {
      console.error('No se pudo recalcular montos del presupuesto:', e.message);
    }
    return actualizado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detRepuestosContratistaOT.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetRepuestosContratistaOT no encontrado');
    
    await prisma.detRepuestosContratistaOT.delete({ where: { id } });
    // Recalcular montos del presupuesto al quitar un ítem
    try {
      await documentoCompraPresupuestoService.recalcularMontosPresupuesto(existente.detContratistaOTId);
    } catch (e) {
      console.error('No se pudo recalcular montos del presupuesto:', e.message);
    }
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
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