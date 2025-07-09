import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para SerieDoc
 * Aplica validaciones de existencia de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos de la serie
 */
async function validarForaneas(data) {
  // tipoDocumentoId
  if (data.tipoDocumentoId !== undefined && data.tipoDocumentoId !== null) {
    const tipoDoc = await prisma.tipoDocumento.findUnique({ where: { id: data.tipoDocumentoId } });
    if (!tipoDoc) throw new ValidationError('El tipo de documento referenciado no existe.');
  }
  // tipoAlmacenId
  if (data.tipoAlmacenId !== undefined && data.tipoAlmacenId !== null) {
    const tipoAlm = await prisma.tipoAlmacen.findUnique({ where: { id: data.tipoAlmacenId } });
    if (!tipoAlm) throw new ValidationError('El tipo de almacén referenciado no existe.');
  }
}

/**
 * Lista todas las series de documento.
 */
const listar = async () => {
  try {
    return await prisma.serieDoc.findMany({ include: { movimientos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una serie por ID (incluyendo movimientos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const serie = await prisma.serieDoc.findUnique({ where: { id }, include: { movimientos: true } });
    if (!serie) throw new NotFoundError('SerieDoc no encontrada');
    return serie;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una serie validando existencia de claves foráneas principales y campos obligatorios.
 */
const crear = async (data) => {
  try {
    if (!data.tipoDocumentoId || !data.tipoAlmacenId || !data.serie) {
      throw new ValidationError('Los campos tipoDocumentoId, tipoAlmacenId y serie son obligatorios.');
    }
    await validarForaneas(data);
    return await prisma.serieDoc.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una serie existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.serieDoc.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('SerieDoc no encontrada');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.serieDoc.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una serie por ID, validando existencia y que no tenga movimientos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.serieDoc.findUnique({ where: { id }, include: { movimientos: true } });
    if (!existente) throw new NotFoundError('SerieDoc no encontrada');
    if (existente.movimientos && existente.movimientos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene movimientos de almacén asociados.');
    }
    await prisma.serieDoc.delete({ where: { id } });
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
