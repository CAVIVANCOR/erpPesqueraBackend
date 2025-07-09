import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CentroCosto
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de CategoriaCCosto.
 * Lanza ValidationError si no existe.
 * @param {BigInt} categoriaId
 */
async function validarCategoria(categoriaId) {
  const categoria = await prisma.categoriaCCosto.findUnique({ where: { id: categoriaId } });
  if (!categoria) throw new ValidationError('La categoría de centro de costo no existe.');
}

/**
 * Lista todos los centros de costo.
 */
const listar = async () => {
  try {
    return await prisma.centroCosto.findMany({ include: { categoria: true, empresasCentro: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un centro de costo por ID (incluyendo relaciones asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const centro = await prisma.centroCosto.findUnique({ where: { id }, include: { categoria: true, empresasCentro: true } });
    if (!centro) throw new NotFoundError('Centro de costo no encontrado');
    return centro;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un centro de costo validando existencia de CategoriaID y campos obligatorios.
 */
const crear = async (data) => {
  try {
    if (!data.Codigo || !data.Nombre || !data.CategoriaID) {
      throw new ValidationError('Los campos Codigo, Nombre y CategoriaID son obligatorios.');
    }
    await validarCategoria(data.CategoriaID);
    return await prisma.centroCosto.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un centro de costo existente, validando existencia y claves foráneas.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.centroCosto.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Centro de costo no encontrado');
    if (data.CategoriaID !== undefined && data.CategoriaID !== null) {
      await validarCategoria(data.CategoriaID);
    }
    return await prisma.centroCosto.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un centro de costo por ID, validando existencia y que no tenga empresas asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.centroCosto.findUnique({ where: { id }, include: { empresasCentro: true } });
    if (!existente) throw new NotFoundError('Centro de costo no encontrado');
    if (existente.empresasCentro && existente.empresasCentro.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene empresas asociadas.');
    }
    await prisma.centroCosto.delete({ where: { id } });
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
