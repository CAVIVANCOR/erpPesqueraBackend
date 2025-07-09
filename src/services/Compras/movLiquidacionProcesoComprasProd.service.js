import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para MovLiquidacionProcesoComprasProd
 * Aplica validaciones de existencia de claves foráneas principales.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del movimiento
 */
async function validarForaneas(data) {
  // liquidacionProcesoComprasProdId
  if (data.liquidacionProcesoComprasProdId !== undefined && data.liquidacionProcesoComprasProdId !== null) {
    const liq = await prisma.liquidacionProcesoComprasProd.findUnique({ where: { id: data.liquidacionProcesoComprasProdId } });
    if (!liq) throw new ValidationError('La liquidación de proceso de compras referenciada no existe.');
  }
}

/**
 * Lista todos los movimientos de liquidación de proceso de compras prod.
 */
const listar = async () => {
  try {
    return await prisma.movLiquidacionProcesoComprasProd.findMany();
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
    const mov = await prisma.movLiquidacionProcesoComprasProd.findUnique({ where: { id } });
    if (!mov) throw new NotFoundError('MovLiquidacionProcesoComprasProd no encontrado');
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
    if (!data.liquidacionProcesoComprasProdId || !data.tipoMovimientoId || !data.monto || !data.fechaMovimiento) {
      throw new ValidationError('Los campos liquidacionProcesoComprasProdId, tipoMovimientoId, monto y fechaMovimiento son obligatorios.');
    }
    await validarForaneas(data);
    return await prisma.movLiquidacionProcesoComprasProd.create({ data });
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
    const existente = await prisma.movLiquidacionProcesoComprasProd.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MovLiquidacionProcesoComprasProd no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.movLiquidacionProcesoComprasProd.update({ where: { id }, data });
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
    const existente = await prisma.movLiquidacionProcesoComprasProd.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MovLiquidacionProcesoComprasProd no encontrado');
    await prisma.movLiquidacionProcesoComprasProd.delete({ where: { id } });
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
