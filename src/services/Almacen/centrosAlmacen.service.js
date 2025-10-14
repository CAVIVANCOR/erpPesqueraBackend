import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CentrosAlmacen
 * Incluye validaciones de unicidad y manejo de errores personalizados.
 * Documentado en español.
 */

async function listar() {
  try {
    return await prisma.centrosAlmacen.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

async function obtenerPorId(id) {
  try {
    const centro = await prisma.centrosAlmacen.findUnique({ where: { id } });
    if (!centro) throw new NotFoundError('Centro de Almacén no encontrado');
    return centro;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Valida que no exista un centro de almacén duplicado con el mismo nombre.
 * Lanza ConflictError si ya existe un registro igual.
 * @param {Object} param0 - Objeto con los campos a validar
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarDuplicado({ nombre }, excluirId = null) {
  if (!nombre) return;
  const where = { nombre };
  const existe = await prisma.centrosAlmacen.findFirst({ 
    where: excluirId ? { ...where, id: { not: excluirId } } : where 
  });
  if (existe) throw new ConflictError('Ya existe un centro de almacén con el mismo nombre');
}

/**
 * Crea un centro de almacén nuevo validando unicidad.
 * @param {Object} data - Datos del centro de almacén
 * @returns {Promise<Object>} - Centro de almacén creado
 */
async function crear(data) {
  try {
    await validarDuplicado(data);
    return await prisma.centrosAlmacen.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Actualiza un centro de almacén existente, validando primero la existencia del ID y duplicados.
 * @param {BigInt|number} id - ID del centro de almacén a actualizar
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - Centro de almacén actualizado
 */
async function actualizar(id, data) {
  try {
    const existente = await prisma.centrosAlmacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Centro de Almacén no encontrado');
    await validarDuplicado(data, id);
    const actualizado = await prisma.centrosAlmacen.update({ where: { id }, data });
    return actualizado;
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

async function eliminar(id) {
  try {
    const existente = await prisma.centrosAlmacen.findUnique({ 
      where: { id },
      include: { almacenes: true }
    });
    if (!existente) throw new NotFoundError('Centro de Almacén no encontrado');
    if (existente.almacenes && existente.almacenes.length > 0) {
      throw new ConflictError('No se puede eliminar el centro porque tiene almacenes asociados');
    }
    await prisma.centrosAlmacen.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};