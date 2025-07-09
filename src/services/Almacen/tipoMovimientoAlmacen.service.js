import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoMovimientoAlmacen
 * Aplica validaciones de campos obligatorios y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Lista todos los tipos de movimiento de almacén.
 */
const listar = async () => {
  try {
    return await prisma.tipoMovimientoAlmacen.findMany({ include: { conceptos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de movimiento de almacén por ID (incluyendo conceptos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoMovimientoAlmacen.findUnique({ where: { id }, include: { conceptos: true } });
    if (!tipo) throw new NotFoundError('TipoMovimientoAlmacen no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de movimiento validando campo obligatorio nombre.
 */
const crear = async (data) => {
  try {
    if (!data.nombre) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    return await prisma.tipoMovimientoAlmacen.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de movimiento existente, validando existencia y campo obligatorio nombre.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoMovimientoAlmacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TipoMovimientoAlmacen no encontrado');
    if (data.nombre !== undefined && (!data.nombre || data.nombre.trim() === '')) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    return await prisma.tipoMovimientoAlmacen.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de movimiento por ID, validando existencia y que no tenga conceptos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoMovimientoAlmacen.findUnique({ where: { id }, include: { conceptos: true } });
    if (!existente) throw new NotFoundError('TipoMovimientoAlmacen no encontrado');
    if (existente.conceptos && existente.conceptos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene conceptos asociados.');
    }
    await prisma.tipoMovimientoAlmacen.delete({ where: { id } });
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
