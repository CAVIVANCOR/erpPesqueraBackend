import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Color
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Lista todos los colores.
 */
const listar = async () => {
  try {
    return await prisma.color.findMany({ include: { productos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un color por ID (incluyendo productos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const color = await prisma.color.findUnique({ where: { id }, include: { productos: true } });
    if (!color) throw new NotFoundError('Color no encontrado');
    return color;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un color.
 */
const crear = async (data) => {
  try {
    return await prisma.color.create({ data });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un color existente, validando existencia.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.color.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Color no encontrado');
    return await prisma.color.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un color por ID, validando existencia y que no tenga productos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.color.findUnique({ where: { id }, include: { productos: true } });
    if (!existente) throw new NotFoundError('Color no encontrado');
    if (existente.productos && existente.productos.length > 0) {
      throw new ConflictError('No se puede eliminar el color porque tiene productos asociados.');
    }
    await prisma.color.delete({ where: { id } });
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
