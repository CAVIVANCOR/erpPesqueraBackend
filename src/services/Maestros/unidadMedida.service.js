import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para UnidadMedida
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de unidad_base_id en UnidadMedida (autorreferencia).
 * Lanza ValidationError si la unidad base no existe.
 * @param {Object} data - Datos de la unidad de medida
 */
async function validarUnidadMedida(data) {
  if (data.unidad_base_id !== undefined && data.unidad_base_id !== null) {
    const existe = await prisma.unidadMedida.findUnique({ where: { id: data.unidad_base_id } });
    if (!existe) throw new ValidationError('Unidad base no existente para el campo unidad_base_id.');
  }
}

/**
 * Lista todas las unidades de medida.
 */
const listar = async () => {
  try {
    return await prisma.unidadMedida.findMany({ include: { productos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una unidad de medida por ID (incluyendo productos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const unidad = await prisma.unidadMedida.findUnique({ where: { id }, include: { productos: true } });
    if (!unidad) throw new NotFoundError('Unidad de medida no encontrada');
    return unidad;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una unidad de medida validando unidad_base_id.
 */
const crear = async (data) => {
  try {
    await validarUnidadMedida(data);
    return await prisma.unidadMedida.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una unidad de medida existente, validando existencia y unidad_base_id.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.unidadMedida.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Unidad de medida no encontrada');
    await validarUnidadMedida(data);
    return await prisma.unidadMedida.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una unidad de medida por ID, validando existencia y que no tenga productos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.unidadMedida.findUnique({ where: { id }, include: { productos: true } });
    if (!existente) throw new NotFoundError('Unidad de medida no encontrada');
    if (existente.productos && existente.productos.length > 0) {
      throw new ConflictError('No se puede eliminar la unidad de medida porque tiene productos asociados.');
    }
    await prisma.unidadMedida.delete({ where: { id } });
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
