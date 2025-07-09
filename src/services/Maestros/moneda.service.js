import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Moneda
 * Aplica validaciones de unicidad, relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de codigoSunat.
 * Lanza ConflictError si ya existe una moneda con ese código.
 * @param {Object} data - Datos de la moneda
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarMoneda(data, excluirId = null) {
  if (data.codigoSunat) {
    const where = excluirId ? { codigoSunat: data.codigoSunat, id: { not: excluirId } } : { codigoSunat: data.codigoSunat };
    const existe = await prisma.moneda.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe una moneda con ese código SUNAT.');
  }
}

/**
 * Lista todas las monedas.
 */
const listar = async () => {
  try {
    return await prisma.moneda.findMany({ include: { precios: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una moneda por ID (incluyendo precios asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const moneda = await prisma.moneda.findUnique({ where: { id }, include: { precios: true } });
    if (!moneda) throw new NotFoundError('Moneda no encontrada');
    return moneda;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una moneda validando unicidad.
 */
const crear = async (data) => {
  try {
    await validarMoneda(data);
    return await prisma.moneda.create({ data });
  } catch (err) {
    if (err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una moneda existente, validando existencia y unicidad.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.moneda.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Moneda no encontrada');
    await validarMoneda(data, id);
    return await prisma.moneda.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una moneda por ID, validando existencia y que no tenga precios asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.moneda.findUnique({ where: { id }, include: { precios: true } });
    if (!existente) throw new NotFoundError('Moneda no encontrada');
    if (existente.precios && existente.precios.length > 0) {
      throw new ConflictError('No se puede eliminar la moneda porque tiene precios asociados.');
    }
    await prisma.moneda.delete({ where: { id } });
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
