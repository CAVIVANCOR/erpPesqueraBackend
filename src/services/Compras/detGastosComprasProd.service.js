import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetGastosComprasProd
 * Aplica validaciones de existencia de claves foráneas principales.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del gasto
 */
async function validarForaneas(data) {
  // cotizacionComprasId
  if (data.cotizacionComprasId !== undefined && data.cotizacionComprasId !== null) {
    const cot = await prisma.cotizacionCompras.findUnique({ where: { id: data.cotizacionComprasId } });
    if (!cot) throw new ValidationError('La cotización de compras referenciada no existe.');
  }
}

/**
 * Lista todos los gastos de compras prod.
 */
const listar = async () => {
  try {
    return await prisma.detGastosComprasProd.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un gasto por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const gasto = await prisma.detGastosComprasProd.findUnique({ where: { id } });
    if (!gasto) throw new NotFoundError('DetGastosComprasProd no encontrado');
    return gasto;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un gasto validando existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.cotizacionComprasId || !data.entregaARendirPComprasId || !data.detMovEntregaRendirPComprasId || !data.costoProduccionId || !data.monto) {
      throw new ValidationError('Los campos cotizacionComprasId, entregaARendirPComprasId, detMovEntregaRendirPComprasId, costoProduccionId y monto son obligatorios.');
    }
    await validarForaneas(data);
    return await prisma.detGastosComprasProd.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un gasto existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detGastosComprasProd.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetGastosComprasProd no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.detGastosComprasProd.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un gasto por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detGastosComprasProd.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetGastosComprasProd no encontrado');
    await prisma.detGastosComprasProd.delete({ where: { id } });
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
