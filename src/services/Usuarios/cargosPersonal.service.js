import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CargosPersonal
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de descripcion (si se provee).
 * Lanza ConflictError si ya existe un cargo con la misma descripción.
 * @param {Object} data - Datos del cargo
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarCargo(data, excluirId = null) {
  if (data.descripcion) {
    const where = excluirId ? { descripcion: data.descripcion, id: { not: excluirId } } : { descripcion: data.descripcion };
    const existe = await prisma.cargosPersonal.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un cargo con esa descripción.');
  }
}

/**
 * Lista todos los cargos de personal.
 */
const listar = async () => {
  try {
    return await prisma.cargosPersonal.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un cargo por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const cargo = await prisma.cargosPersonal.findUnique({ where: { id } });
    if (!cargo) throw new NotFoundError('Cargo no encontrado');
    return cargo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un cargo nuevo validando unicidad.
 */
const crear = async (data) => {
  try {
    await validarCargo(data);
    return await prisma.cargosPersonal.create({ data });
  } catch (err) {
    if (err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un cargo existente, validando existencia y unicidad.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.cargosPersonal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Cargo no encontrado');
    await validarCargo(data, id);
    return await prisma.cargosPersonal.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un cargo por ID, validando existencia y que no tenga personal asociado.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.cargosPersonal.findUnique({
      where: { id },
      include: { personal: true }
    });
    if (!existente) throw new NotFoundError('Cargo no encontrado');
    if (existente.personal && existente.personal.length > 0) {
      throw new ConflictError('No se puede eliminar el cargo porque tiene personal asociado.');
    }
    await prisma.cargosPersonal.delete({ where: { id } });
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
