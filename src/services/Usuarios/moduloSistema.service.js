import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para ModuloSistema
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de nombre.
 * Lanza ConflictError si ya existe un módulo con el mismo nombre.
 * @param {Object} data - Datos del módulo
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarModulo(data, excluirId = null) {
  if (data.nombre) {
    const where = excluirId ? { nombre: data.nombre, id: { not: excluirId } } : { nombre: data.nombre };
    const existe = await prisma.moduloSistema.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un módulo con ese nombre.');
  }
}

/**
 * Lista todos los módulos del sistema, incluyendo submódulos.
 */
const listar = async () => {
  try {
    return await prisma.moduloSistema.findMany({ include: { submodulos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un módulo por ID (incluyendo submódulos).
 */
const obtenerPorId = async (id) => {
  try {
    const modulo = await prisma.moduloSistema.findUnique({ where: { id }, include: { submodulos: true } });
    if (!modulo) throw new NotFoundError('Módulo no encontrado');
    return modulo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un módulo validando unicidad.
 */
const crear = async (data) => {
  try {
    await validarModulo(data);
    return await prisma.moduloSistema.create({ data });
  } catch (err) {
    if (err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un módulo existente, validando existencia y unicidad.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.moduloSistema.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Módulo no encontrado');
    await validarModulo(data, id);
    return await prisma.moduloSistema.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un módulo por ID, validando existencia y que no tenga submódulos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.moduloSistema.findUnique({ where: { id }, include: { submodulos: true } });
    if (!existente) throw new NotFoundError('Módulo no encontrado');
    if (existente.submodulos && existente.submodulos.length > 0) {
      throw new ConflictError('No se puede eliminar el módulo porque tiene submódulos asociados.');
    }
    await prisma.moduloSistema.delete({ where: { id } });
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
