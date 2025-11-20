import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetMovsEntregaRendirPCompras
 * Aplica validaciones de existencia de claves foráneas principales.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del movimiento
 */
async function validarForaneas(data) {
  // entregaARendirPComprasId
  if (data.entregaARendirPComprasId !== undefined && data.entregaARendirPComprasId !== null) {
    const entrega = await prisma.entregaARendirPCompras.findUnique({ where: { id: data.entregaARendirPComprasId } });
    if (!entrega) throw new ValidationError('La entrega a rendir referenciada no existe.');
  }
  // tipoMovimientoId
  if (data.tipoMovimientoId !== undefined && data.tipoMovimientoId !== null) {
    const tipo = await prisma.tipoMovEntregaRendir.findUnique({ where: { id: data.tipoMovimientoId } });
    if (!tipo) throw new ValidationError('El tipo de movimiento referenciado no existe.');
  }
  // productoId (opcional)
  if (data.productoId !== undefined && data.productoId !== null) {
    const producto = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!producto) throw new ValidationError('El producto referenciado no existe.');
  }
}

/**
 * Lista todos los movimientos de entrega a rendir de compras.
 */
const listar = async () => {
  try {
    return await prisma.detMovsEntregaRendirPCompras.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un movimiento por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const mov = await prisma.detMovsEntregaRendirPCompras.findUnique({ where: { id } });
    if (!mov) throw new NotFoundError('DetMovsEntregaRendirPCompras no encontrado');
    return mov;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un movimiento validando existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.entregaARendirPComprasId || !data.responsableId || !data.fechaMovimiento || !data.tipoMovimientoId || !data.centroCostoId || !data.monto) {
      throw new ValidationError('Todos los campos obligatorios deben estar presentes.');
    }
    await validarForaneas(data);
    return await prisma.detMovsEntregaRendirPCompras.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un movimiento existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detMovsEntregaRendirPCompras.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetMovsEntregaRendirPCompras no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.detMovsEntregaRendirPCompras.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un movimiento por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detMovsEntregaRendirPCompras.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetMovsEntregaRendirPCompras no encontrado');
    await prisma.detMovsEntregaRendirPCompras.delete({ where: { id } });
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
