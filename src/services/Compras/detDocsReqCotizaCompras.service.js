import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetDocsReqCotizaCompras
 * Aplica validaciones de existencia de claves foráneas principales.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del documento requerido
 */
async function validarForaneas(data) {
  // cotizacionComprasId
  if (data.cotizacionComprasId !== undefined && data.cotizacionComprasId !== null) {
    const cot = await prisma.cotizacionCompras.findUnique({ where: { id: data.cotizacionComprasId } });
    if (!cot) throw new ValidationError('La cotización de compras referenciada no existe.');
  }
  // docRequeridaComprasId
  if (data.docRequeridaComprasId !== undefined && data.docRequeridaComprasId !== null) {
    const doc = await prisma.docRequeridaComprasVentas.findUnique({ where: { id: data.docRequeridaComprasId } });
    if (!doc) throw new ValidationError('El documento requerido de compras referenciado no existe.');
  }
}

/**
 * Lista todos los documentos requeridos asociados a cotizaciones de compras.
 */
const listar = async () => {
  try {
    return await prisma.detDocsReqCotizaCompras.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un documento requerido por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detDocsReqCotizaCompras.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('DetDocsReqCotizaCompras no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un documento requerido validando existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.cotizacionComprasId || !data.docRequeridaComprasId || typeof data.verificado !== 'boolean') {
      throw new ValidationError('Los campos cotizacionComprasId, docRequeridaComprasId y verificado son obligatorios.');
    }
    await validarForaneas(data);
    return await prisma.detDocsReqCotizaCompras.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un documento requerido existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detDocsReqCotizaCompras.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetDocsReqCotizaCompras no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.detDocsReqCotizaCompras.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un documento requerido por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detDocsReqCotizaCompras.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetDocsReqCotizaCompras no encontrado');
    await prisma.detDocsReqCotizaCompras.delete({ where: { id } });
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
