import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para PermisoAutorizacion
 * Aplica validaciones de unicidad y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de nombre.
 * Lanza ValidationError si ya existe.
 * @param {Object} data - Datos del permiso
 * @param {BigInt} [id] - ID del registro a excluir (para update)
 */
async function validarPermisoAutorizacion(data, id = null) {
  if (data.nombre !== undefined && data.nombre !== null) {
    const where = id ? { nombre: data.nombre, NOT: { id } } : { nombre: data.nombre };
    const existe = await prisma.permisoAutorizacion.findFirst({ where });
    if (existe) throw new ValidationError('El nombre ya está registrado para otro permiso de autorización.');
  }
}

/**
 * Lista todos los permisos de autorización.
 */
const listar = async () => {
  try {
    return await prisma.permisoAutorizacion.findMany({ include: { activosPermiso: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un permiso de autorización por ID (incluyendo detalles asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const permiso = await prisma.permisoAutorizacion.findUnique({ where: { id }, include: { activosPermiso: true } });
    if (!permiso) throw new NotFoundError('Permiso de autorización no encontrado');
    return permiso;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un permiso de autorización validando unicidad de nombre.
 */
const crear = async (data) => {
  try {
    await validarPermisoAutorizacion(data);
    return await prisma.permisoAutorizacion.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un permiso de autorización existente, validando existencia y unicidad de nombre.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.permisoAutorizacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Permiso de autorización no encontrado');
    await validarPermisoAutorizacion(data, id);
    return await prisma.permisoAutorizacion.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un permiso de autorización por ID, validando existencia y que no tenga detalles asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.permisoAutorizacion.findUnique({ where: { id }, include: { activosPermiso: true } });
    if (!existente) throw new NotFoundError('Permiso de autorización no encontrado');
    if (existente.activosPermiso && existente.activosPermiso.length > 0) {
      throw new ConflictError('No se puede eliminar el permiso porque tiene detalles asociados.');
    }
    await prisma.permisoAutorizacion.delete({ where: { id } });
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
