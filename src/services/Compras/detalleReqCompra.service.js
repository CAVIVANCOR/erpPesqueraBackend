import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleReqCompra
 * Aplica validaciones de existencia de claves foráneas y prevención de borrado si tiene movimientos asociados.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del detalle
 */
async function validarForaneas(data) {
  // requerimientoCompraId
  if (data.requerimientoCompraId !== undefined && data.requerimientoCompraId !== null) {
    const req = await prisma.requerimientoCompra.findUnique({ where: { id: data.requerimientoCompraId } });
    if (!req) throw new ValidationError('El requerimiento de compra referenciado no existe.');
  }
  // productoId
  if (data.productoId !== undefined && data.productoId !== null) {
    const prod = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!prod) throw new ValidationError('El producto referenciado no existe.');
  }
}

/**
 * Lista todos los detalles de requerimiento de compra.
 */
const listar = async () => {
  try {
    return await prisma.detalleReqCompra.findMany();
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
    const det = await prisma.detalleReqCompra.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('DetalleReqCompra no encontrado');
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
    if (!data.requerimientoCompraId || !data.productoId || !data.cantidadSolicitada) {
      throw new ValidationError('Los campos requerimientoCompraId, productoId y cantidadSolicitada son obligatorios.');
    }
    await validarForaneas(data);
    return await prisma.detalleReqCompra.create({ data });
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
    const existente = await prisma.detalleReqCompra.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleReqCompra no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.detalleReqCompra.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un detalle por ID, previniendo si tiene movimientos de almacén asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detalleReqCompra.findUnique({
      where: { id },
      include: { detalleMovimientos: true }
    });
    if (!existente) throw new NotFoundError('DetalleReqCompra no encontrado');
    if (existente.detalleMovimientos && existente.detalleMovimientos.length > 0) {
      throw new ConflictError('No se puede eliminar el detalle porque tiene movimientos de almacén asociados.');
    }
    await prisma.detalleReqCompra.delete({ where: { id } });
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
