import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoEntidad
 * Aplica validaciones de unicidad, relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de nombre.
 * Lanza ConflictError si ya existe un tipo con ese nombre.
 * @param {Object} data - Datos del tipo de entidad
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarTipoEntidad(data, excluirId = null) {
  if (data.nombre) {
    const where = excluirId ? { nombre: data.nombre, id: { not: excluirId } } : { nombre: data.nombre };
    const existe = await prisma.tipoEntidad.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un tipo de entidad con ese nombre.');
  }
}

/**
 * Lista todos los tipos de entidad.
 */
const listar = async () => {
  try {
    return await prisma.tipoEntidad.findMany({ include: { entidades: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de entidad por ID (incluyendo entidades comerciales asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoEntidad.findUnique({ where: { id }, include: { entidades: true } });
    if (!tipo) throw new NotFoundError('Tipo de entidad no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de entidad validando unicidad.
 */
const crear = async (data) => {
  try {
    await validarTipoEntidad(data);
    return await prisma.tipoEntidad.create({ data });
  } catch (err) {
    if (err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de entidad existente, validando existencia y unicidad.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de entidad no encontrado');
    await validarTipoEntidad(data, id);
    return await prisma.tipoEntidad.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de entidad por ID, validando existencia y que no tenga entidades comerciales asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoEntidad.findUnique({ where: { id }, include: { entidades: true } });
    if (!existente) throw new NotFoundError('Tipo de entidad no encontrado');
    if (existente.entidades && existente.entidades.length > 0) {
      throw new ConflictError('No se puede eliminar el tipo de entidad porque tiene entidades comerciales asociadas.');
    }
    await prisma.tipoEntidad.delete({ where: { id } });
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
