import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para FormaPago
 * Aplica validaciones de unicidad, relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de nombre.
 * Lanza ConflictError si ya existe una forma de pago con ese nombre.
 * @param {Object} data - Datos de la forma de pago
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarFormaPago(data, excluirId = null) {
  if (data.nombre) {
    const where = excluirId ? { nombre: data.nombre, id: { not: excluirId } } : { nombre: data.nombre };
    const existe = await prisma.formaPago.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe una forma de pago con ese nombre.');
  }
}

/**
 * Lista todas las formas de pago.
 */
const listar = async () => {
  try {
    return await prisma.formaPago.findMany({ include: { entidades: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una forma de pago por ID (incluyendo entidades comerciales asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const forma = await prisma.formaPago.findUnique({ where: { id }, include: { entidades: true } });
    if (!forma) throw new NotFoundError('Forma de pago no encontrada');
    return forma;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una forma de pago validando unicidad.
 */
const crear = async (data) => {
  try {
    await validarFormaPago(data);
    return await prisma.formaPago.create({ data });
  } catch (err) {
    if (err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una forma de pago existente, validando existencia y unicidad.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.formaPago.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Forma de pago no encontrada');
    await validarFormaPago(data, id);
    return await prisma.formaPago.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una forma de pago por ID, validando existencia y que no tenga entidades comerciales asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.formaPago.findUnique({ where: { id }, include: { entidades: true } });
    if (!existente) throw new NotFoundError('Forma de pago no encontrada');
    if (existente.entidades && existente.entidades.length > 0) {
      throw new ConflictError('No se puede eliminar la forma de pago porque tiene entidades comerciales asociadas.');
    }
    await prisma.formaPago.delete({ where: { id } });
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
