import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleOrdenCompra
 * Aplica validaciones de existencia de claves foráneas principales.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del detalle
 */
async function validarForaneas(data) {
  // ordenCompraId
  if (data.ordenCompraId !== undefined && data.ordenCompraId !== null) {
    const orden = await prisma.ordenCompra.findUnique({ where: { id: data.ordenCompraId } });
    if (!orden) throw new ValidationError('La orden de compra referenciada no existe.');
  }
  // productoId
  if (data.productoId !== undefined && data.productoId !== null) {
    const prod = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!prod) throw new ValidationError('El producto referenciado no existe.');
  }
}

/**
 * Lista todos los detalles de orden de compra.
 */
const listar = async () => {
  try {
    return await prisma.detalleOrdenCompra.findMany();
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
    const det = await prisma.detalleOrdenCompra.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('DetalleOrdenCompra no encontrado');
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
    if (!data.ordenCompraId || !data.productoId || !data.cantidad) {
      throw new ValidationError('Los campos ordenCompraId, productoId y cantidad son obligatorios.');
    }
    await validarForaneas(data);
    return await prisma.detalleOrdenCompra.create({ data });
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
    const existente = await prisma.detalleOrdenCompra.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleOrdenCompra no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.detalleOrdenCompra.update({ where: { id }, data });
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
    const existente = await prisma.detalleOrdenCompra.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleOrdenCompra no encontrado');
    await prisma.detalleOrdenCompra.delete({ where: { id } });
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
