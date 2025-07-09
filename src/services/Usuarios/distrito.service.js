import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Distrito
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de codSUNAT y existencia de provinciaId.
 * Lanza ConflictError o ValidationError según corresponda.
 * @param {Object} data - Datos del distrito
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarDistrito(data, excluirId = null) {
  // Validar unicidad de codSUNAT
  if (data.codSUNAT) {
    const where = excluirId ? { codSUNAT: data.codSUNAT, id: { not: excluirId } } : { codSUNAT: data.codSUNAT };
    const existe = await prisma.distrito.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un distrito con ese código SUNAT.');
  }
  // Validar existencia de Provincia
  if (data.provinciaId) {
    const provincia = await prisma.provincia.findUnique({ where: { id: data.provinciaId } });
    if (!provincia) throw new ValidationError('Provincia no existente.');
  }
}

/**
 * Lista todos los distritos, incluyendo ubigeos y provincia asociada.
 */
const listar = async () => {
  try {
    return await prisma.distrito.findMany({ include: { ubigeos: true, provincia: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un distrito por ID (incluyendo ubigeos y provincia asociada).
 */
const obtenerPorId = async (id) => {
  try {
    const distrito = await prisma.distrito.findUnique({ where: { id }, include: { ubigeos: true, provincia: true } });
    if (!distrito) throw new NotFoundError('Distrito no encontrado');
    return distrito;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un distrito validando unicidad y referencias.
 */
const crear = async (data) => {
  try {
    await validarDistrito(data);
    return await prisma.distrito.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un distrito existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.distrito.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Distrito no encontrado');
    await validarDistrito(data, id);
    return await prisma.distrito.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un distrito por ID, validando existencia y que no tenga ubigeos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.distrito.findUnique({ where: { id }, include: { ubigeos: true } });
    if (!existente) throw new NotFoundError('Distrito no encontrado');
    if (existente.ubigeos && existente.ubigeos.length > 0) {
      throw new ConflictError('No se puede eliminar el distrito porque tiene ubigeos asociados.');
    }
    await prisma.distrito.delete({ where: { id } });
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
