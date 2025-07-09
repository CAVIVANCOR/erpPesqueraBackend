import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoMovimientoAcceso
 * Aplica validaciones de unicidad y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de nombre.
 * Lanza ValidationError si ya existe.
 * @param {Object} data - Datos del tipo de movimiento
 * @param {BigInt} [id] - ID del registro a excluir (para update)
 */
async function validarTipoMovimientoAcceso(data, id = null) {
  if (data.nombre !== undefined && data.nombre !== null) {
    const where = id ? { nombre: data.nombre, NOT: { id } } : { nombre: data.nombre };
    const existe = await prisma.tipoMovimientoAcceso.findFirst({ where });
    if (existe) throw new ValidationError('El nombre ya está registrado para otro tipo de movimiento de acceso.');
  }
}

/**
 * Lista todos los tipos de movimiento de acceso.
 */
const listar = async () => {
  try {
    return await prisma.tipoMovimientoAcceso.findMany({ include: { detalles: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de movimiento por ID (incluyendo detalles asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoMovimientoAcceso.findUnique({ where: { id }, include: { detalles: true } });
    if (!tipo) throw new NotFoundError('TipoMovimientoAcceso no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de movimiento validando unicidad de nombre.
 */
const crear = async (data) => {
  try {
    if (!data.nombre) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    await validarTipoMovimientoAcceso(data);
    return await prisma.tipoMovimientoAcceso.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de movimiento existente, validando existencia y unicidad de nombre.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoMovimientoAcceso.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TipoMovimientoAcceso no encontrado');
    if (data.nombre !== undefined && (!data.nombre || data.nombre.trim() === '')) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    await validarTipoMovimientoAcceso(data, id);
    return await prisma.tipoMovimientoAcceso.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de movimiento por ID, validando existencia y que no tenga detalles asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoMovimientoAcceso.findUnique({ where: { id }, include: { detalles: true } });
    if (!existente) throw new NotFoundError('TipoMovimientoAcceso no encontrado');
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.tipoMovimientoAcceso.delete({ where: { id } });
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
  crear,
  actualizar,
  eliminar
};
