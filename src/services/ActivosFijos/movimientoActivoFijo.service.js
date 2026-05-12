import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para MovimientoActivoFijo
 * Aplica validaciones de existencia de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del movimiento
 */
async function validarForaneas(data) {
  // Validar empresaId
  if (data.empresaId !== undefined && data.empresaId !== null) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('La empresa referenciada no existe.');
  }
  // Validar activoId
  if (data.activoId !== undefined && data.activoId !== null) {
    const activo = await prisma.activo.findUnique({ where: { id: data.activoId } });
    if (!activo) throw new ValidationError('El activo fijo referenciado no existe.');
  }
  // Validar tipoMovimientoId
  if (data.tipoMovimientoId !== undefined && data.tipoMovimientoId !== null) {
    const tipo = await prisma.tipoMovimientoActivoFijo.findUnique({ where: { id: data.tipoMovimientoId } });
    if (!tipo) throw new ValidationError('El tipo de movimiento referenciado no existe.');
  }
  // Validar monedaId
  if (data.monedaId !== undefined && data.monedaId !== null) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('La moneda referenciada no existe.');
  }
  // Validar asientoContableId (opcional)
  if (data.asientoContableId !== undefined && data.asientoContableId !== null) {
    const asiento = await prisma.asientoContable.findUnique({ where: { id: data.asientoContableId } });
    if (!asiento) throw new ValidationError('El asiento contable referenciado no existe.');
  }
}

/**
 * Lista todos los movimientos de activos fijos.
 */
const listar = async () => {
  try {
    return await prisma.movimientoActivoFijo.findMany({ 
      include: { 
        empresa: true,
        activo: true,
        tipoMovimiento: true,
        moneda: true,
        asientoContable: true
      } 
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un movimiento por ID (incluyendo todas las relaciones).
 */
const obtenerPorId = async (id) => {
  try {
    const mov = await prisma.movimientoActivoFijo.findUnique({ 
      where: { id }, 
      include: { 
        empresa: true,
        activo: true,
        tipoMovimiento: true,
        moneda: true,
        asientoContable: true
      } 
    });
    if (!mov) throw new NotFoundError('MovimientoActivoFijo no encontrado');
    return mov;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un movimiento validando claves foráneas.
 */
const crear = async (data) => {
  try {
    // Validaciones de campos obligatorios
    if (!data.empresaId) throw new ValidationError('El campo empresaId es obligatorio.');
    if (!data.activoId) throw new ValidationError('El campo activoId es obligatorio.');
    if (!data.tipoMovimientoId) throw new ValidationError('El campo tipoMovimientoId es obligatorio.');
    if (!data.fechaMovimiento) throw new ValidationError('El campo fechaMovimiento es obligatorio.');
    if (!data.monto) throw new ValidationError('El campo monto es obligatorio.');
    if (!data.monedaId) throw new ValidationError('El campo monedaId es obligatorio.');
    
    await validarForaneas(data);
    
    // Preparar datos para creación
    const dataCreacion = {
      empresaId: data.empresaId,
      activoId: data.activoId,
      tipoMovimientoId: data.tipoMovimientoId,
      fechaMovimiento: new Date(data.fechaMovimiento),
      fechaContable: data.fechaContable ? new Date(data.fechaContable) : null,
      monto: data.monto,
      monedaId: data.monedaId,
      depreciacionMensual: data.depreciacionMensual || null,
      depreciacionAcumulada: data.depreciacionAcumulada || null,
      valorNeto: data.valorNeto || null,
      observaciones: data.observaciones || null,
      asientoContableId: data.asientoContableId || null,
      creadoPor: data.creadoPor || null,
      actualizadoPor: data.actualizadoPor || null
    };
    
    return await prisma.movimientoActivoFijo.create({ 
      data: dataCreacion,
      include: { 
        empresa: true,
        activo: true,
        tipoMovimiento: true,
        moneda: true,
        asientoContable: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un movimiento existente, validando existencia y claves foráneas.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.movimientoActivoFijo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MovimientoActivoFijo no encontrado');
    
    await validarForaneas(data);
    
    // Preparar datos para actualización
    const dataActualizacion = {};
    if (data.empresaId !== undefined) dataActualizacion.empresaId = data.empresaId;
    if (data.activoId !== undefined) dataActualizacion.activoId = data.activoId;
    if (data.tipoMovimientoId !== undefined) dataActualizacion.tipoMovimientoId = data.tipoMovimientoId;
    if (data.fechaMovimiento !== undefined) dataActualizacion.fechaMovimiento = new Date(data.fechaMovimiento);
    if (data.fechaContable !== undefined) dataActualizacion.fechaContable = data.fechaContable ? new Date(data.fechaContable) : null;
    if (data.monto !== undefined) dataActualizacion.monto = data.monto;
    if (data.monedaId !== undefined) dataActualizacion.monedaId = data.monedaId;
    if (data.depreciacionMensual !== undefined) dataActualizacion.depreciacionMensual = data.depreciacionMensual;
    if (data.depreciacionAcumulada !== undefined) dataActualizacion.depreciacionAcumulada = data.depreciacionAcumulada;
    if (data.valorNeto !== undefined) dataActualizacion.valorNeto = data.valorNeto;
    if (data.observaciones !== undefined) dataActualizacion.observaciones = data.observaciones;
    if (data.asientoContableId !== undefined) dataActualizacion.asientoContableId = data.asientoContableId;
    if (data.actualizadoPor !== undefined) dataActualizacion.actualizadoPor = data.actualizadoPor;
    
    return await prisma.movimientoActivoFijo.update({ 
      where: { id }, 
      data: dataActualizacion,
      include: { 
        empresa: true,
        activo: true,
        tipoMovimiento: true,
        moneda: true,
        asientoContable: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un movimiento por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.movimientoActivoFijo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MovimientoActivoFijo no encontrado');
    
    await prisma.movimientoActivoFijo.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista movimientos por activo.
 */
const listarPorActivo = async (activoId) => {
  try {
    return await prisma.movimientoActivoFijo.findMany({ 
      where: { activoId },
      include: { 
        empresa: true,
        activo: true,
        tipoMovimiento: true,
        moneda: true,
        asientoContable: true
      },
      orderBy: { fechaMovimiento: 'desc' }
    });
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
  eliminar,
  listarPorActivo
};