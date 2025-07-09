import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para AgrupacionEntidad
 * Aplica validaciones de unicidad, relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de nombre.
 * Lanza ConflictError si ya existe una agrupación con ese nombre.
 * @param {Object} data - Datos de la agrupación
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarAgrupacionEntidad(data, excluirId = null) {
  if (data.nombre) {
    const where = excluirId ? { nombre: data.nombre, id: { not: excluirId } } : { nombre: data.nombre };
    const existe = await prisma.agrupacionEntidad.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe una agrupación de entidad con ese nombre.');
  }
}

/**
 * Lista todas las agrupaciones de entidad.
 */
const listar = async () => {
  try {
    return await prisma.agrupacionEntidad.findMany({ include: { entidades: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una agrupación por ID (incluyendo entidades comerciales asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const agrup = await prisma.agrupacionEntidad.findUnique({ where: { id }, include: { entidades: true } });
    if (!agrup) throw new NotFoundError('Agrupación de entidad no encontrada');
    return agrup;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una agrupación validando unicidad.
 */
const crear = async (data) => {
  try {
    await validarAgrupacionEntidad(data);
    return await prisma.agrupacionEntidad.create({ data });
  } catch (err) {
    if (err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una agrupación existente, validando existencia y unicidad.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.agrupacionEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Agrupación de entidad no encontrada');
    await validarAgrupacionEntidad(data, id);
    return await prisma.agrupacionEntidad.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una agrupación por ID, validando existencia y que no tenga entidades comerciales asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.agrupacionEntidad.findUnique({ where: { id }, include: { entidades: true } });
    if (!existente) throw new NotFoundError('Agrupación de entidad no encontrada');
    if (existente.entidades && existente.entidades.length > 0) {
      throw new ConflictError('No se puede eliminar la agrupación porque tiene entidades comerciales asociadas.');
    }
    await prisma.agrupacionEntidad.delete({ where: { id } });
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
