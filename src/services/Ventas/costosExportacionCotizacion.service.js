import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CostosExportacionCotizacion
 * Gestiona costos estimados y reales de exportación por cotización
 * Permite comparar estimado vs real y calcular variaciones
 * Documentado en español.
 */

/**
 * Lista todos los costos de exportación
 */
const listar = async () => {
  try {
    return await prisma.costosExportacionCotizacion.findMany({
      include: {
        cotizacionVentas: true,
        producto: {
          include: {
            familia: true
          }
        },
        moneda: true,
        proveedor: true,
        movimientoEntregaRendir: true
      },
      orderBy: [
        { cotizacionVentasId: 'asc' },
        { orden: 'asc' }
      ]
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un costo por ID
 */
const obtenerPorId = async (id) => {
  try {
    const costo = await prisma.costosExportacionCotizacion.findUnique({
      where: { id },
      include: {
        cotizacionVentas: true,
        producto: {
          include: {
            familia: true
          }
        },
        moneda: true,
        proveedor: true,
        movimientoEntregaRendir: true
      }
    });
    if (!costo) throw new NotFoundError('Costo de exportación no encontrado');
    return costo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene costos por cotización
 */
const obtenerPorCotizacion = async (cotizacionVentasId) => {
  try {
    return await prisma.costosExportacionCotizacion.findMany({
      where: { cotizacionVentasId },
      include: {
        producto: {
          include: {
            familia: true
          }
        },
        moneda: true,
        proveedor: true,
        movimientoEntregaRendir: true
      },
      orderBy: { orden: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene costos con variación (real vs estimado)
 */
const obtenerCostosConVariacion = async (cotizacionVentasId) => {
  try {
    const costos = await prisma.costosExportacionCotizacion.findMany({
      where: { 
        cotizacionVentasId,
        montoReal: { not: null }
      },
      include: {
        producto: true,
        moneda: true,
        proveedor: true
      },
      orderBy: { orden: 'asc' }
    });
    return costos;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un nuevo costo de exportación
 */
const crear = async (data) => {
  try {
    if (!data.cotizacionVentasId || !data.productoId || !data.monedaId) {
      throw new ValidationError('Faltan campos obligatorios: cotizacionVentasId, productoId, monedaId');
    }

    // Validar existencia de cotización
    const cotizacion = await prisma.cotizacionVentas.findUnique({ 
      where: { id: data.cotizacionVentasId } 
    });
    if (!cotizacion) throw new ValidationError('Cotización no existente.');

    // Validar existencia de producto
    const producto = await prisma.producto.findUnique({ 
      where: { id: data.productoId },
      include: { familia: true }
    });
    if (!producto) throw new ValidationError('Producto no existente.');
    
    // Validar que sea de familia Gastos Exportación
    if (producto.familiaId !== 7) {
      throw new ValidationError('El producto debe pertenecer a la familia "Gastos Exportación" (ID: 7).');
    }

    // Validar moneda
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('Moneda no existente.');

    // Validar proveedor si se proporciona
    if (data.proveedorId) {
      const proveedor = await prisma.entidadComercial.findUnique({ 
        where: { id: data.proveedorId } 
      });
      if (!proveedor) throw new ValidationError('Proveedor no existente.');
    }

    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaCreacion: data.fechaCreacion || new Date(),
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };

    return await prisma.costosExportacionCotizacion.create({
      data: datosConAuditoria,
      include: {
        cotizacionVentas: true,
        producto: true,
        moneda: true,
        proveedor: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un costo de exportación
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.costosExportacionCotizacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Costo de exportación no encontrado');

    // Validar referencias si cambian
    if (data.productoId && data.productoId !== existente.productoId) {
      const producto = await prisma.producto.findUnique({ 
        where: { id: data.productoId },
        include: { familia: true }
      });
      if (!producto) throw new ValidationError('Producto no existente.');
      if (producto.familiaId !== 7) {
        throw new ValidationError('El producto debe pertenecer a la familia "Gastos Exportación" (ID: 7).');
      }
    }

    if (data.monedaId && data.monedaId !== existente.monedaId) {
      const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
      if (!moneda) throw new ValidationError('Moneda no existente.');
    }

    if (data.proveedorId && data.proveedorId !== existente.proveedorId) {
      const proveedor = await prisma.entidadComercial.findUnique({ 
        where: { id: data.proveedorId } 
      });
      if (!proveedor) throw new ValidationError('Proveedor no existente.');
    }

    // Calcular variación si se actualiza monto real
    if (data.montoReal !== undefined && data.montoReal !== null) {
      const montoEstimado = data.montoEstimadoMonedaBase || existente.montoEstimadoMonedaBase;
      const montoReal = data.montoRealMonedaBase || data.montoReal;
      
      data.variacionMonto = montoReal - montoEstimado;
      data.variacionPorcentaje = montoEstimado > 0 
        ? ((montoReal - montoEstimado) / montoEstimado) * 100 
        : 0;
    }

    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaCreacion: data.fechaCreacion || existente.fechaCreacion || new Date(),
      creadoPor: data.creadoPor || existente.creadoPor || null,
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };

    return await prisma.costosExportacionCotizacion.update({
      where: { id },
      data: datosConAuditoria,
      include: {
        cotizacionVentas: true,
        producto: true,
        moneda: true,
        proveedor: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Registra el monto real desde un movimiento de entrega a rendir
 */
const registrarMontoReal = async (id, movimientoEntregaRendirId, montoReal, montoRealMonedaBase) => {
  try {
    const existente = await prisma.costosExportacionCotizacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Costo de exportación no encontrado');

    const variacionMonto = montoRealMonedaBase - existente.montoEstimadoMonedaBase;
    const variacionPorcentaje = existente.montoEstimadoMonedaBase > 0
      ? ((montoRealMonedaBase - existente.montoEstimadoMonedaBase) / existente.montoEstimadoMonedaBase) * 100
      : 0;

    return await prisma.costosExportacionCotizacion.update({
      where: { id },
      data: {
        montoReal,
        montoRealMonedaBase,
        variacionMonto,
        variacionPorcentaje,
        movimientoEntregaRendirId,
        fechaActualizacion: new Date()
      },
      include: {
        cotizacionVentas: true,
        producto: true,
        moneda: true,
        movimientoEntregaRendir: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un costo de exportación
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.costosExportacionCotizacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Costo de exportación no encontrado');

    await prisma.costosExportacionCotizacion.delete({ where: { id } });
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
  obtenerPorCotizacion,
  obtenerCostosConVariacion,
  crear,
  actualizar,
  registrarMontoReal,
  eliminar
};