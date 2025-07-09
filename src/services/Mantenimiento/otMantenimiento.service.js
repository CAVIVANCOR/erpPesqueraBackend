import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para OTMantenimiento
 * Aplica validaciones de unicidad y existencia de claves foráneas.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos de la OT
 */
async function validarForaneas(data) {
  // tipoMantenimientoId
  if (data.tipoMantenimientoId !== undefined && data.tipoMantenimientoId !== null) {
    const tipoMant = await prisma.tipoMantenimiento.findUnique({ where: { id: data.tipoMantenimientoId } });
    if (!tipoMant) throw new ValidationError('El tipo de mantenimiento referenciado no existe.');
  }
  // motivoOriginoId
  if (data.motivoOriginoId !== undefined && data.motivoOriginoId !== null) {
    const motivo = await prisma.motivoOriginoOT.findUnique({ where: { id: data.motivoOriginoId } });
    if (!motivo) throw new ValidationError('El motivo de origen referenciado no existe.');
  }
}

/**
 * Valida unicidad de código antes de crear o actualizar.
 * @param {string} codigo - Código a validar
 * @param {BigInt} [id] - ID a excluir (para update)
 */
async function validarUnicidadCodigo(codigo, id = null) {
  const existe = await prisma.oTMantenimiento.findFirst({ where: id ? { codigo, NOT: { id } } : { codigo } });
  if (existe) throw new ConflictError('El código ya está registrado para otra orden de trabajo.');
}

/**
 * Lista todas las órdenes de trabajo de mantenimiento.
 */
const listar = async () => {
  try {
    return await prisma.oTMantenimiento.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una OT por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const ot = await prisma.oTMantenimiento.findUnique({ where: { id } });
    if (!ot) throw new NotFoundError('OTMantenimiento no encontrada');
    return ot;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una OT validando unicidad de código y existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.codigo || !data.empresaId || !data.tipoMantenimientoId || !data.motivoOriginoId || !data.estadoId) {
      throw new ValidationError('Los campos codigo, empresaId, tipoMantenimientoId, motivoOriginoId y estadoId son obligatorios.');
    }
    await validarForaneas(data);
    await validarUnicidadCodigo(data.codigo);
    return await prisma.oTMantenimiento.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una OT existente, validando existencia, unicidad y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.oTMantenimiento.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('OTMantenimiento no encontrada');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    // Validar unicidad de código si se modifica
    if (data.codigo && data.codigo !== existente.codigo) {
      await validarUnicidadCodigo(data.codigo, id);
    }
    return await prisma.oTMantenimiento.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una OT por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.oTMantenimiento.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('OTMantenimiento no encontrada');
    await prisma.oTMantenimiento.delete({ where: { id } });
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
