import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para LiquidacionProcesoComprasProd
 * Aplica validaciones de existencia de claves foráneas y prevención de borrado si tiene movimientos asociados.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos de la liquidación
 */
async function validarForaneas(data) {
  // cotizacionComprasId
  if (data.cotizacionComprasId !== undefined && data.cotizacionComprasId !== null) {
    const cot = await prisma.cotizacionCompras.findUnique({ where: { id: data.cotizacionComprasId } });
    if (!cot) throw new ValidationError('La cotización de compras referenciada no existe.');
  }
}

/**
 * Lista todas las liquidaciones de proceso de compras prod.
 */
const listar = async () => {
  try {
    return await prisma.liquidacionProcesoComprasProd.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una liquidación por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const liquidacion = await prisma.liquidacionProcesoComprasProd.findUnique({ where: { id } });
    if (!liquidacion) throw new NotFoundError('LiquidacionProcesoComprasProd no encontrada');
    return liquidacion;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una liquidación validando existencia de claves foráneas y unicidad de cotizacionComprasId.
 */
const crear = async (data) => {
  try {
    if (!data.cotizacionComprasId || !data.empresaId || !data.fechaLiquidacion || !data.responsableId || !data.saldoFinal) {
      throw new ValidationError('Los campos cotizacionComprasId, empresaId, fechaLiquidacion, responsableId y saldoFinal son obligatorios.');
    }
    await validarForaneas(data);
    // Validar unicidad de cotizacionComprasId
    const existe = await prisma.liquidacionProcesoComprasProd.findUnique({ where: { cotizacionComprasId: data.cotizacionComprasId } });
    if (existe) throw new ConflictError('Ya existe una liquidación para la cotización de compras indicada.');
    return await prisma.liquidacionProcesoComprasProd.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una liquidación existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.liquidacionProcesoComprasProd.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('LiquidacionProcesoComprasProd no encontrada');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    // Validar unicidad de cotizacionComprasId si se modifica
    if (data.cotizacionComprasId && data.cotizacionComprasId !== existente.cotizacionComprasId) {
      const existeOtra = await prisma.liquidacionProcesoComprasProd.findUnique({ where: { cotizacionComprasId: data.cotizacionComprasId } });
      if (existeOtra) throw new ConflictError('Ya existe una liquidación para la cotización de compras indicada.');
    }
    return await prisma.liquidacionProcesoComprasProd.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una liquidación por ID, previniendo si tiene movimientos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.liquidacionProcesoComprasProd.findUnique({
      where: { id },
      include: { movimientos: true }
    });
    if (!existente) throw new NotFoundError('LiquidacionProcesoComprasProd no encontrada');
    if (existente.movimientos && existente.movimientos.length > 0) {
      throw new ConflictError('No se puede eliminar la liquidación porque tiene movimientos asociados.');
    }
    await prisma.liquidacionProcesoComprasProd.delete({ where: { id } });
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
