import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleMovimientoAlmacen
 * Aplica validaciones de existencia de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del detalle
 */
async function validarForaneas(data) {
  // Validar movimientoAlmacenId
  if (data.movimientoAlmacenId !== undefined && data.movimientoAlmacenId !== null) {
    const mov = await prisma.movimientoAlmacen.findUnique({ where: { id: data.movimientoAlmacenId } });
    if (!mov) throw new ValidationError('El movimiento de almacén referenciado no existe.');
  }
  // Validar productoId
  if (data.productoId !== undefined && data.productoId !== null) {
    const prod = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!prod) throw new ValidationError('El producto referenciado no existe.');
  }
  // Validar detalleReqCompraId (opcional)
  if (data.detalleReqCompraId !== undefined && data.detalleReqCompraId !== null) {
    const req = await prisma.detalleReqCompra.findUnique({ where: { id: data.detalleReqCompraId } });
    if (!req) throw new ValidationError('El detalle de requerimiento de compra referenciado no existe.');
  }
}

/**
 * Lista todos los detalles de movimiento de almacén.
 */
const listar = async () => {
  try {
    return await prisma.detalleMovimientoAlmacen.findMany();
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
    const detalle = await prisma.detalleMovimientoAlmacen.findUnique({ where: { id } });
    if (!detalle) throw new NotFoundError('DetalleMovimientoAlmacen no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un detalle validando existencia de claves foráneas principales y campos obligatorios.
 */
const crear = async (data) => {
  try {
    if (!data.movimientoAlmacenId || !data.productoId || !data.cantidad || !data.empresaId) {
      throw new ValidationError('Los campos movimientoAlmacenId, productoId, cantidad y empresaId son obligatorios.');
    }
    await validarForaneas(data);
    return await prisma.detalleMovimientoAlmacen.create({ data });
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
    const existente = await prisma.detalleMovimientoAlmacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleMovimientoAlmacen no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.detalleMovimientoAlmacen.update({ where: { id }, data });
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
    const existente = await prisma.detalleMovimientoAlmacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleMovimientoAlmacen no encontrado');
    await prisma.detalleMovimientoAlmacen.delete({ where: { id } });
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
