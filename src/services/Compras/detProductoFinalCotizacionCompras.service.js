import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetProductoFinalCotizacionCompras
 * Aplica validaciones de existencia de claves foráneas principales.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del detalle
 */
async function validarForaneas(data) {
  // cotizacionComprasId
  if (data.cotizacionComprasId !== undefined && data.cotizacionComprasId !== null) {
    const cot = await prisma.cotizacionCompras.findUnique({ where: { id: data.cotizacionComprasId } });
    if (!cot) throw new ValidationError('La cotización de compras referenciada no existe.');
  }
  // productoFinalId
  if (data.productoFinalId !== undefined && data.productoFinalId !== null) {
    const prod = await prisma.producto.findUnique({ where: { id: data.productoFinalId } });
    if (!prod) throw new ValidationError('El producto final referenciado no existe.');
  }
}

/**
 * Lista todos los detalles de producto final de cotización de compras.
 */
const listar = async () => {
  try {
    return await prisma.detProductoFinalCotizacionCompras.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un detalle por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detProductoFinalCotizacionCompras.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('DetProductoFinalCotizacionCompras no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un detalle validando existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.cotizacionComprasId || !data.productoFinalId || !data.cantidad || !data.peso || !data.costoUnitMateriaPrima || !data.costoUnitProceso || !data.costoUnitario) {
      throw new ValidationError('Todos los campos obligatorios deben estar presentes.');
    }
    await validarForaneas(data);
    return await prisma.detProductoFinalCotizacionCompras.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un detalle existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detProductoFinalCotizacionCompras.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetProductoFinalCotizacionCompras no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.detProductoFinalCotizacionCompras.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un detalle por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detProductoFinalCotizacionCompras.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetProductoFinalCotizacionCompras no encontrado');
    await prisma.detProductoFinalCotizacionCompras.delete({ where: { id } });
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
