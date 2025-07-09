import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Departamento
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de codSUNAT y existencia de paisId.
 * Lanza ConflictError o ValidationError según corresponda.
 * @param {Object} data - Datos del departamento
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarDepartamento(data, excluirId = null) {
  // Validar unicidad de codSUNAT
  if (data.codSUNAT) {
    const where = excluirId ? { codSUNAT: data.codSUNAT, id: { not: excluirId } } : { codSUNAT: data.codSUNAT };
    const existe = await prisma.departamento.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un departamento con ese código SUNAT.');
  }
  // Validar existencia de Pais
  if (data.paisId) {
    const pais = await prisma.pais.findUnique({ where: { id: data.paisId } });
    if (!pais) throw new ValidationError('País no existente.');
  }
}

/**
 * Lista todos los departamentos, incluyendo provincias, ubigeos y país asociado.
 */
const listar = async () => {
  try {
    return await prisma.departamento.findMany({ include: { provincias: true, ubigeos: true, pais: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un departamento por ID (incluyendo provincias, ubigeos y país asociado).
 */
const obtenerPorId = async (id) => {
  try {
    const departamento = await prisma.departamento.findUnique({ where: { id }, include: { provincias: true, ubigeos: true, pais: true } });
    if (!departamento) throw new NotFoundError('Departamento no encontrado');
    return departamento;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un departamento validando unicidad y referencias.
 */
const crear = async (data) => {
  try {
    await validarDepartamento(data);
    return await prisma.departamento.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un departamento existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.departamento.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Departamento no encontrado');
    await validarDepartamento(data, id);
    return await prisma.departamento.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un departamento por ID, validando existencia y que no tenga provincias o ubigeos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.departamento.findUnique({ where: { id }, include: { provincias: true, ubigeos: true } });
    if (!existente) throw new NotFoundError('Departamento no encontrado');
    if ((existente.provincias && existente.provincias.length > 0) || (existente.ubigeos && existente.ubigeos.length > 0)) {
      throw new ConflictError('No se puede eliminar el departamento porque tiene provincias o ubigeos asociados.');
    }
    await prisma.departamento.delete({ where: { id } });
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
