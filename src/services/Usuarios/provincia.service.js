import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Provincia
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de codSUNAT y existencia de departamentoId.
 * Lanza ConflictError o ValidationError según corresponda.
 * @param {Object} data - Datos de la provincia
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarProvincia(data, excluirId = null) {
  // Validar unicidad de codSUNAT
  if (data.codSUNAT) {
    const where = excluirId ? { codSUNAT: data.codSUNAT, id: { not: excluirId } } : { codSUNAT: data.codSUNAT };
    const existe = await prisma.provincia.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe una provincia con ese código SUNAT.');
  }
  // Validar existencia de Departamento
  if (data.departamentoId) {
    const departamento = await prisma.departamento.findUnique({ where: { id: data.departamentoId } });
    if (!departamento) throw new ValidationError('Departamento no existente.');
  }
}

/**
 * Lista todas las provincias, incluyendo ubigeos y departamento asociado.
 */
const listar = async () => {
  try {
    return await prisma.provincia.findMany({ include: { ubigeos: true, departamento: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una provincia por ID (incluyendo ubigeos y departamento asociado).
 */
const obtenerPorId = async (id) => {
  try {
    const provincia = await prisma.provincia.findUnique({ where: { id }, include: { ubigeos: true, departamento: true } });
    if (!provincia) throw new NotFoundError('Provincia no encontrada');
    return provincia;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una provincia validando unicidad y referencias.
 */
const crear = async (data) => {
  try {
    await validarProvincia(data);
    return await prisma.provincia.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una provincia existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.provincia.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Provincia no encontrada');
    await validarProvincia(data, id);
    return await prisma.provincia.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una provincia por ID, validando existencia y que no tenga ubigeos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.provincia.findUnique({ where: { id }, include: { ubigeos: true } });
    if (!existente) throw new NotFoundError('Provincia no encontrada');
    if ((existente.ubigeos && existente.ubigeos.length > 0)) {
      throw new ConflictError('No se puede eliminar la provincia porque tiene ubigeos asociados.');
    }
    await prisma.provincia.delete({ where: { id } });
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
