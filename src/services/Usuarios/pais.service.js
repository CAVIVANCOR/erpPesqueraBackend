import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Pais
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de codSUNAT.
 * Lanza ConflictError si ya existe un país con el mismo código SUNAT.
 * @param {Object} data - Datos del país
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarPais(data, excluirId = null) {
  if (data.codSUNAT) {
    const where = excluirId ? { codSUNAT: data.codSUNAT, id: { not: excluirId } } : { codSUNAT: data.codSUNAT };
    const existe = await prisma.pais.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un país con ese código SUNAT.');
  }
}

/**
 * Lista todos los países, incluyendo departamentos y ubigeos asociados.
 */
const listar = async () => {
  try {
    return await prisma.pais.findMany({ include: { departamentos: true, ubigeos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un país por ID (incluyendo departamentos y ubigeos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const pais = await prisma.pais.findUnique({ where: { id }, include: { departamentos: true, ubigeos: true } });
    if (!pais) throw new NotFoundError('País no encontrado');
    return pais;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un país validando unicidad.
 */
const crear = async (data) => {
  try {
    await validarPais(data);
    return await prisma.pais.create({ data });
  } catch (err) {
    if (err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un país existente, validando existencia y unicidad.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.pais.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('País no encontrado');
    await validarPais(data, id);
    return await prisma.pais.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un país por ID, validando existencia y que no tenga departamentos o ubigeos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.pais.findUnique({ where: { id }, include: { departamentos: true, ubigeos: true } });
    if (!existente) throw new NotFoundError('País no encontrado');
    if ((existente.departamentos && existente.departamentos.length > 0) || (existente.ubigeos && existente.ubigeos.length > 0)) {
      throw new ConflictError('No se puede eliminar el país porque tiene departamentos o ubigeos asociados.');
    }
    await prisma.pais.delete({ where: { id } });
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
