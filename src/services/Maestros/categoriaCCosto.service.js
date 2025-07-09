import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CategoriaCCosto
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Lista todas las categorías de centro de costo.
 */
const listar = async () => {
  try {
    return await prisma.categoriaCCosto.findMany({ include: { centros: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una categoría por ID (incluyendo centros asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const categoria = await prisma.categoriaCCosto.findUnique({ where: { id }, include: { centros: true } });
    if (!categoria) throw new NotFoundError('Categoría de centro de costo no encontrada');
    return categoria;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una categoría de centro de costo.
 */
const crear = async (data) => {
  try {
    if (!data.nombre) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    return await prisma.categoriaCCosto.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una categoría de centro de costo existente, validando existencia.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.categoriaCCosto.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Categoría de centro de costo no encontrada');
    if (data.nombre !== undefined && (!data.nombre || data.nombre.trim() === '')) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    return await prisma.categoriaCCosto.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una categoría de centro de costo por ID, validando existencia y que no tenga centros asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.categoriaCCosto.findUnique({ where: { id }, include: { centros: true } });
    if (!existente) throw new NotFoundError('Categoría de centro de costo no encontrada');
    if (existente.centros && existente.centros.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene centros de costo asociados.');
    }
    await prisma.categoriaCCosto.delete({ where: { id } });
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
