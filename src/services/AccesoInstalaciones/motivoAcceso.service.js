import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para MotivoAcceso
 * Aplica validaciones de unicidad y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de nombre.
 * Lanza ValidationError si ya existe.
 * @param {Object} data - Datos del motivo de acceso
 * @param {BigInt} [id] - ID del registro a excluir (para update)
 */
async function validarMotivoAcceso(data, id = null) {
  if (data.nombre !== undefined && data.nombre !== null) {
    const where = id ? { nombre: data.nombre, NOT: { id } } : { nombre: data.nombre };
    const existe = await prisma.motivoAcceso.findFirst({ where });
    if (existe) throw new ValidationError('El nombre ya está registrado para otro motivo de acceso.');
  }
}

/**
 * Lista todos los motivos de acceso.
 */
const listar = async () => {
  try {
    return await prisma.motivoAcceso.findMany({ include: { accesos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un motivo de acceso por ID (incluyendo accesos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const motivo = await prisma.motivoAcceso.findUnique({ where: { id }, include: { accesos: true } });
    if (!motivo) throw new NotFoundError('MotivoAcceso no encontrado');
    return motivo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un motivo de acceso validando unicidad de nombre.
 */
const crear = async (data) => {
  try {
    if (!data.nombre) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    await validarMotivoAcceso(data);
    return await prisma.motivoAcceso.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un motivo de acceso existente, validando existencia y unicidad de nombre.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.motivoAcceso.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MotivoAcceso no encontrado');
    if (data.nombre !== undefined && (!data.nombre || data.nombre.trim() === '')) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    await validarMotivoAcceso(data, id);
    return await prisma.motivoAcceso.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un motivo de acceso por ID, validando existencia y que no tenga accesos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.motivoAcceso.findUnique({ where: { id }, include: { accesos: true } });
    if (!existente) throw new NotFoundError('MotivoAcceso no encontrado');
    if (existente.accesos && existente.accesos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene accesos asociados.');
    }
    await prisma.motivoAcceso.delete({ where: { id } });
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
