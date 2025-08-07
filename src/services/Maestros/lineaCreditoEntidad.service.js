import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para LineaCreditoEntidad
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de entidadComercialId.
 * Lanza ConflictError y ValidationError según corresponda.
 * @param {Object} data - Datos de la línea de crédito
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarLineaCreditoEntidad(data, excluirId = null) {
  // Validar existencia de EntidadComercial
  if (data.entidadComercialId) {
    const existe = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!existe) throw new ValidationError('Entidad comercial no existente.');
    // Validar unicidad de entidadComercialId
    const where = excluirId
      ? { entidadComercialId: data.entidadComercialId, id: { not: excluirId } }
      : { entidadComercialId: data.entidadComercialId };
    const existeLinea = await prisma.lineaCreditoEntidad.findFirst({ where });
    if (existeLinea) throw new ConflictError('Ya existe una línea de crédito para esta entidad comercial.');
  }
}

/**
 * Lista todas las líneas de crédito de entidades comerciales.
 */
const listar = async () => {
  try {
    return await prisma.lineaCreditoEntidad.findMany({
      include: {
        entidadComercial: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una línea de crédito por ID (incluyendo entidad comercial asociada).
 */
const obtenerPorId = async (id) => {
  try {
    const linea = await prisma.lineaCreditoEntidad.findUnique({
      where: { id },
      include: { entidadComercial: true }
    });
    if (!linea) throw new NotFoundError('Línea de crédito no encontrada');
    return linea;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una línea de crédito validando unicidad y referencias.
 */
const crear = async (data) => {
  try {
    await validarLineaCreditoEntidad(data);
    return await prisma.lineaCreditoEntidad.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una línea de crédito existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.lineaCreditoEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Línea de crédito no encontrada');
    await validarLineaCreditoEntidad(data, id);
    return await prisma.lineaCreditoEntidad.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una línea de crédito por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.lineaCreditoEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Línea de crédito no encontrada');
    await prisma.lineaCreditoEntidad.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
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
