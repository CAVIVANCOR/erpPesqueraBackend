import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para MovimientoAlmacen
 * Aplica validaciones de existencia de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del movimiento
 * @param {BigInt} [id] - ID del registro a excluir (para update)
 */
async function validarForaneas(data) {
  // Validar tipoDocumentoId
  if (data.tipoDocumentoId !== undefined && data.tipoDocumentoId !== null) {
    const tipoDoc = await prisma.tipoDocumento.findUnique({ where: { id: data.tipoDocumentoId } });
    if (!tipoDoc) throw new ValidationError('El tipo de documento referenciado no existe.');
  }
  // Validar conceptoMovAlmacenId
  if (data.conceptoMovAlmacenId !== undefined && data.conceptoMovAlmacenId !== null) {
    const concepto = await prisma.conceptoMovAlmacen.findUnique({ where: { id: data.conceptoMovAlmacenId } });
    if (!concepto) throw new ValidationError('El concepto de movimiento de almacén referenciado no existe.');
  }
  // Validar serieDocId (opcional)
  if (data.serieDocId !== undefined && data.serieDocId !== null) {
    const serie = await prisma.serieDoc.findUnique({ where: { id: data.serieDocId } });
    if (!serie) throw new ValidationError('La serie de documento referenciada no existe.');
  }
  // Validar entidadComercialId (opcional)
  if (data.entidadComercialId !== undefined && data.entidadComercialId !== null) {
    const entidad = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!entidad) throw new ValidationError('La entidad comercial referenciada no existe.');
  }
}

/**
 * Lista todos los movimientos de almacén.
 */
const listar = async () => {
  try {
    return await prisma.movimientoAlmacen.findMany({ include: { detalles: true, preFacturasSalida: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un movimiento por ID (incluyendo detalles y prefacturas asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const mov = await prisma.movimientoAlmacen.findUnique({ where: { id }, include: { detalles: true, preFacturasSalida: true } });
    if (!mov) throw new NotFoundError('MovimientoAlmacen no encontrado');
    return mov;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un movimiento de almacén validando existencia de claves foráneas principales y campos obligatorios.
 */
const crear = async (data) => {
  try {
    if (!data.empresaId || !data.tipoDocumentoId || !data.conceptoMovAlmacenId || !data.fechaDocumento) {
      throw new ValidationError('Los campos empresaId, tipoDocumentoId, conceptoMovAlmacenId y fechaDocumento son obligatorios.');
    }
    await validarForaneas(data);
    return await prisma.movimientoAlmacen.create({ data });
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
    const existente = await prisma.movimientoAlmacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MovimientoAlmacen no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.movimientoAlmacen.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un movimiento de almacén por ID, validando existencia y que no tenga detalles asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.movimientoAlmacen.findUnique({ where: { id }, include: { detalles: true } });
    if (!existente) throw new NotFoundError('MovimientoAlmacen no encontrado');
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.movimientoAlmacen.delete({ where: { id } });
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
