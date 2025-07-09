import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para SubfamiliaProducto
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de familiaId en FamiliaProducto.
 * Lanza ValidationError si la familia no existe.
 * @param {Object} data - Datos de la subfamilia
 */
async function validarSubfamilia(data) {
  if (data.familiaId) {
    const existe = await prisma.familiaProducto.findUnique({ where: { id: data.familiaId } });
    if (!existe) throw new ValidationError('Familia de producto no existente para el campo familiaId.');
  }
}

/**
 * Lista todas las subfamilias de producto.
 */
const listar = async () => {
  try {
    return await prisma.subfamiliaProducto.findMany({ include: { productos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una subfamilia de producto por ID (incluyendo productos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const subfamilia = await prisma.subfamiliaProducto.findUnique({ where: { id }, include: { productos: true } });
    if (!subfamilia) throw new NotFoundError('Subfamilia de producto no encontrada');
    return subfamilia;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una subfamilia de producto validando familiaId.
 */
const crear = async (data) => {
  try {
    await validarSubfamilia(data);
    return await prisma.subfamiliaProducto.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una subfamilia de producto existente, validando existencia y familiaId.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.subfamiliaProducto.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Subfamilia de producto no encontrada');
    await validarSubfamilia(data);
    return await prisma.subfamiliaProducto.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una subfamilia de producto por ID, validando existencia y que no tenga productos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.subfamiliaProducto.findUnique({ where: { id }, include: { productos: true } });
    if (!existente) throw new NotFoundError('Subfamilia de producto no encontrada');
    if (existente.productos && existente.productos.length > 0) {
      throw new ConflictError('No se puede eliminar la subfamilia porque tiene productos asociados.');
    }
    await prisma.subfamiliaProducto.delete({ where: { id } });
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
