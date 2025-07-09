import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para ConceptoMovAlmacen
 * Aplica validaciones de existencia de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del concepto
 */
async function validarForaneas(data) {
  // tipoConceptoId
  if (data.tipoConceptoId !== undefined && data.tipoConceptoId !== null) {
    const tipoConcepto = await prisma.tipoConcepto.findUnique({ where: { id: data.tipoConceptoId } });
    if (!tipoConcepto) throw new ValidationError('El tipo de concepto referenciado no existe.');
  }
  // tipoMovimientoId
  if (data.tipoMovimientoId !== undefined && data.tipoMovimientoId !== null) {
    const tipoMov = await prisma.tipoMovimientoAlmacen.findUnique({ where: { id: data.tipoMovimientoId } });
    if (!tipoMov) throw new ValidationError('El tipo de movimiento de almacén referenciado no existe.');
  }
  // tipoAlmacenId
  if (data.tipoAlmacenId !== undefined && data.tipoAlmacenId !== null) {
    const tipoAlm = await prisma.tipoAlmacen.findUnique({ where: { id: data.tipoAlmacenId } });
    if (!tipoAlm) throw new ValidationError('El tipo de almacén referenciado no existe.');
  }
}

/**
 * Lista todos los conceptos de movimiento de almacén.
 */
const listar = async () => {
  try {
    return await prisma.conceptoMovAlmacen.findMany({ include: { movimientos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un concepto por ID (incluyendo movimientos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const concepto = await prisma.conceptoMovAlmacen.findUnique({ where: { id }, include: { movimientos: true } });
    if (!concepto) throw new NotFoundError('ConceptoMovAlmacen no encontrado');
    return concepto;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un concepto validando existencia de claves foráneas principales y campos obligatorios.
 */
const crear = async (data) => {
  try {
    if (!data.descripcion || !data.tipoConceptoId || !data.tipoMovimientoId || !data.tipoAlmacenId) {
      throw new ValidationError('Los campos descripcion, tipoConceptoId, tipoMovimientoId y tipoAlmacenId son obligatorios.');
    }
    await validarForaneas(data);
    return await prisma.conceptoMovAlmacen.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un concepto existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.conceptoMovAlmacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('ConceptoMovAlmacen no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.conceptoMovAlmacen.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un concepto por ID, validando existencia y que no tenga movimientos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.conceptoMovAlmacen.findUnique({ where: { id }, include: { movimientos: true } });
    if (!existente) throw new NotFoundError('ConceptoMovAlmacen no encontrado');
    if (existente.movimientos && existente.movimientos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene movimientos de almacén asociados.');
    }
    await prisma.conceptoMovAlmacen.delete({ where: { id } });
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
