import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Ubigeo
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de codigo y existencia de referencias foráneas.
 * Lanza ConflictError o ValidationError según corresponda.
 * @param {Object} data - Datos del ubigeo
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarUbigeo(data, excluirId = null) {
  // Validar unicidad de codigo
  if (data.codigo) {
    const where = excluirId ? { codigo: data.codigo, id: { not: excluirId } } : { codigo: data.codigo };
    const existe = await prisma.ubigeo.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un ubigeo con ese código.');
  }
  // Validar existencia de Pais
  if (data.paisId) {
    const pais = await prisma.pais.findUnique({ where: { id: data.paisId } });
    if (!pais) throw new ValidationError('País no existente.');
  }
  // Validar existencia de Departamento
  if (data.departamentoId) {
    const departamento = await prisma.departamento.findUnique({ where: { id: data.departamentoId } });
    if (!departamento) throw new ValidationError('Departamento no existente.');
  }
  // Validar existencia de Provincia
  if (data.provinciaId) {
    const provincia = await prisma.provincia.findUnique({ where: { id: data.provinciaId } });
    if (!provincia) throw new ValidationError('Provincia no existente.');
  }
  // Validar existencia de Distrito
  if (data.distritoId) {
    const distrito = await prisma.distrito.findUnique({ where: { id: data.distritoId } });
    if (!distrito) throw new ValidationError('Distrito no existente.');
  }
}

/**
 * Lista todos los ubigeos, incluyendo relaciones principales.
 */
const listar = async () => {
  try {
    return await prisma.ubigeo.findMany({
      include: {
        pais: true,
        departamento: true,
        provincia: true,
        distrito: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un ubigeo por ID (incluyendo relaciones principales).
 */
const obtenerPorId = async (id) => {
  try {
    const ubigeo = await prisma.ubigeo.findUnique({
      where: { id },
      include: {
        pais: true,
        departamento: true,
        provincia: true,
        distrito: true
      }
    });
    if (!ubigeo) throw new NotFoundError('Ubigeo no encontrado');
    return ubigeo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un ubigeo validando unicidad y referencias.
 */
const crear = async (data) => {
  try {
    await validarUbigeo(data);
    return await prisma.ubigeo.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un ubigeo existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.ubigeo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Ubigeo no encontrado');
    await validarUbigeo(data, id);
    return await prisma.ubigeo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un ubigeo por ID, validando existencia y que no tenga direcciones o personas asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.ubigeo.findUnique({
      where: { id },
      include: { direcciones: true, personas: true }
    });
    if (!existente) throw new NotFoundError('Ubigeo no encontrado');
    if ((existente.direcciones && existente.direcciones.length > 0) || (existente.personas && existente.personas.length > 0)) {
      throw new ConflictError('No se puede eliminar el ubigeo porque tiene direcciones o personas asociadas.');
    }
    await prisma.ubigeo.delete({ where: { id } });
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
