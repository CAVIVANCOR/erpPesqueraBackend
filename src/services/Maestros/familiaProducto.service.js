import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para FamiliaProducto
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Lista todas las familias de producto.
 */
const listar = async () => {
  try {
    return await prisma.familiaProducto.findMany({ include: { productos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una familia de producto por ID (incluyendo productos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const familia = await prisma.familiaProducto.findUnique({ where: { id }, include: { productos: true } });
    if (!familia) throw new NotFoundError('Familia de producto no encontrada');
    return familia;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una familia de producto.
 */
const crear = async (data) => {
  try {
    return await prisma.familiaProducto.create({ data });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una familia de producto existente, validando existencia.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.familiaProducto.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Familia de producto no encontrada');
    return await prisma.familiaProducto.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una familia de producto por ID, validando existencia y que no tenga productos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.familiaProducto.findUnique({ where: { id }, include: { productos: true } });
    if (!existente) throw new NotFoundError('Familia de producto no encontrada');
    if (existente.productos && existente.productos.length > 0) {
      throw new ConflictError('No se puede eliminar la familia porque tiene productos asociados.');
    }
    await prisma.familiaProducto.delete({ where: { id } });
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
