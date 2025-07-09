import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para SubmoduloSistema
 * Aplica validaciones de unicidad por módulo, referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de moduloId y unicidad de nombre por módulo (opcional).
 * Lanza ConflictError o ValidationError según corresponda.
 * @param {Object} data - Datos del submódulo
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarSubmodulo(data, excluirId = null) {
  // Validar existencia de ModuloSistema
  if (data.moduloId) {
    const modulo = await prisma.moduloSistema.findUnique({ where: { id: data.moduloId } });
    if (!modulo) throw new ValidationError('Módulo no existente.');
  }
  // Validar unicidad de nombre por módulo (opcional pero recomendado)
  if (data.nombre && data.moduloId) {
    const where = excluirId ? {
      nombre: data.nombre,
      moduloId: data.moduloId,
      id: { not: excluirId }
    } : {
      nombre: data.nombre,
      moduloId: data.moduloId
    };
    const existe = await prisma.submoduloSistema.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un submódulo con ese nombre en el módulo.');
  }
}

/**
 * Lista todos los submódulos del sistema, incluyendo módulo padre.
 */
const listar = async () => {
  try {
    return await prisma.submoduloSistema.findMany({ include: { modulo: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un submódulo por ID (incluyendo módulo padre).
 */
const obtenerPorId = async (id) => {
  try {
    const submodulo = await prisma.submoduloSistema.findUnique({ where: { id }, include: { modulo: true } });
    if (!submodulo) throw new NotFoundError('Submódulo no encontrado');
    return submodulo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un submódulo validando existencia de módulo y unicidad de nombre.
 */
const crear = async (data) => {
  try {
    await validarSubmodulo(data);
    return await prisma.submoduloSistema.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un submódulo existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.submoduloSistema.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Submódulo no encontrado');
    await validarSubmodulo(data, id);
    return await prisma.submoduloSistema.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un submódulo por ID, validando existencia y que no tenga accesos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.submoduloSistema.findUnique({ where: { id }, include: { accesosUsuario: true } });
    if (!existente) throw new NotFoundError('Submódulo no encontrado');
    if (existente.accesosUsuario && existente.accesosUsuario.length > 0) {
      throw new ConflictError('No se puede eliminar el submódulo porque tiene accesos asociados.');
    }
    await prisma.submoduloSistema.delete({ where: { id } });
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
