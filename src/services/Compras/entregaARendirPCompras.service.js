import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para EntregaARendirPCompras
 * Aplica validaciones de existencia de claves foráneas y prevención de borrado si tiene movimientos asociados.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos de la entrega
 */
async function validarForaneas(data) {
  // cotizacionComprasId
  if (data.cotizacionComprasId !== undefined && data.cotizacionComprasId !== null) {
    const cot = await prisma.cotizacionCompras.findUnique({ where: { id: data.cotizacionComprasId } });
    if (!cot) throw new ValidationError('La cotización de compras referenciada no existe.');
  }
}

/**
 * Lista todas las entregas a rendir de compras.
 */
const listar = async () => {
  try {
    return await prisma.entregaARendirPCompras.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una entrega por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const entrega = await prisma.entregaARendirPCompras.findUnique({ where: { id } });
    if (!entrega) throw new NotFoundError('EntregaARendirPCompras no encontrada');
    return entrega;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una entrega validando existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.cotizacionComprasId || !data.respEntregaRendirId || !data.centroCostoId) {
      throw new ValidationError('Los campos cotizacionComprasId, respEntregaRendirId y centroCostoId son obligatorios.');
    }
    await validarForaneas(data);
    return await prisma.entregaARendirPCompras.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una entrega existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.entregaARendirPCompras.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('EntregaARendirPCompras no encontrada');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.entregaARendirPCompras.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una entrega por ID, previniendo si tiene movimientos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.entregaARendirPCompras.findUnique({
      where: { id },
      include: { movimientos: true }
    });
    if (!existente) throw new NotFoundError('EntregaARendirPCompras no encontrada');
    if (existente.movimientos && existente.movimientos.length > 0) {
      throw new ConflictError('No se puede eliminar la entrega porque tiene movimientos asociados.');
    }
    await prisma.entregaARendirPCompras.delete({ where: { id } });
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
