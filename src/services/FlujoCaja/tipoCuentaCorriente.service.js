import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoCuentaCorriente
 * Aplica validaciones de unicidad, manejo de errores personalizado y documentación en español.
 */

/**
 * Valida que no exista un tipo de cuenta corriente duplicado por nombre.
 * Lanza ConflictError si ya existe un registro igual.
 * @param {Object} param0 - Objeto con los campos a validar
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarDuplicado({ nombre }, excluirId = null) {
  const where = excluirId ? { nombre, id: { not: excluirId } } : { nombre };
  const existe = await prisma.tipoCuentaCorriente.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un tipo de cuenta corriente con ese nombre');
}

/**
 * Lista todos los tipos de cuenta corriente.
 */
async function listar() {
  try {
    return await prisma.tipoCuentaCorriente.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Obtiene un tipo de cuenta corriente por ID.
 */
async function obtenerPorId(id) {
  try {
    const tipo = await prisma.tipoCuentaCorriente.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundError('Tipo de cuenta corriente no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Crea un nuevo tipo de cuenta corriente validando unicidad.
 */
async function crear(data) {
  try {
    await validarDuplicado(data);
    return await prisma.tipoCuentaCorriente.create({ data });
  } catch (err) {
    if (err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Actualiza un tipo de cuenta corriente existente, validando existencia y unicidad.
 */
async function actualizar(id, data) {
  try {
    const existente = await prisma.tipoCuentaCorriente.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de cuenta corriente no encontrado');
    await validarDuplicado(data, id);
    return await prisma.tipoCuentaCorriente.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Elimina un tipo de cuenta corriente por ID, validando existencia.
 */
async function eliminar(id) {
  try {
    const existente = await prisma.tipoCuentaCorriente.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de cuenta corriente no encontrado');
    await prisma.tipoCuentaCorriente.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
