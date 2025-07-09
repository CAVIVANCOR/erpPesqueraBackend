import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoActivo
 * Aplica validaciones de unicidad y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de codigo.
 * Lanza ValidationError si ya existe.
 * @param {Object} data - Datos del tipo de activo
 * @param {BigInt} [id] - ID del registro a excluir (para update)
 */
async function validarTipoActivo(data, id = null) {
  if (data.codigo !== undefined && data.codigo !== null) {
    const where = id ? { codigo: data.codigo, NOT: { id } } : { codigo: data.codigo };
    const existe = await prisma.tipoActivo.findFirst({ where });
    if (existe) throw new ValidationError('El código ya está registrado para otro tipo de activo.');
  }
}

/**
 * Lista todos los tipos de activo.
 */
const listar = async () => {
  try {
    return await prisma.tipoActivo.findMany({ include: { activos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de activo por ID (incluyendo activos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoActivo.findUnique({ where: { id }, include: { activos: true } });
    if (!tipo) throw new NotFoundError('Tipo de activo no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de activo validando unicidad de codigo.
 */
const crear = async (data) => {
  try {
    await validarTipoActivo(data);
    return await prisma.tipoActivo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de activo existente, validando existencia y unicidad de codigo.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoActivo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de activo no encontrado');
    await validarTipoActivo(data, id);
    return await prisma.tipoActivo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de activo por ID, validando existencia y que no tenga activos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoActivo.findUnique({ where: { id }, include: { activos: true } });
    if (!existente) throw new NotFoundError('Tipo de activo no encontrado');
    if (existente.activos && existente.activos.length > 0) {
      throw new ConflictError('No se puede eliminar el tipo de activo porque tiene activos asociados.');
    }
    await prisma.tipoActivo.delete({ where: { id } });
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
