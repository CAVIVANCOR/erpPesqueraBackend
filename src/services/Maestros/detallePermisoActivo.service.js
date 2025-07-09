import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetallePermisoActivo
 * Aplica validaciones de relaciones, unicidad y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de activoId y permisoId, y unicidad compuesta.
 * Lanza ValidationError o ConflictError si corresponde.
 * @param {Object} data - Datos del detalle
 * @param {BigInt} [id] - ID del registro a excluir (para update)
 */
async function validarDetallePermisoActivo(data, id = null) {
  if (data.activoId !== undefined && data.activoId !== null) {
    const existeActivo = await prisma.activo.findUnique({ where: { id: data.activoId } });
    if (!existeActivo) throw new ValidationError('Activo no existente para el campo activoId.');
  }
  if (data.permisoId !== undefined && data.permisoId !== null) {
    const existePermiso = await prisma.permisoAutorizacion.findUnique({ where: { id: data.permisoId } });
    if (!existePermiso) throw new ValidationError('Permiso no existente para el campo permisoId.');
  }
  if (data.activoId && data.permisoId) {
    const where = id
      ? { activoId: data.activoId, permisoId: data.permisoId, NOT: { id } }
      : { activoId: data.activoId, permisoId: data.permisoId };
    const existe = await prisma.detallePermisoActivo.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un registro con la misma combinación de activoId y permisoId.');
  }
}

/**
 * Lista todos los detalles de permiso de activo.
 */
const listar = async () => {
  try {
    return await prisma.detallePermisoActivo.findMany({ include: { activo: true, permiso: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un detalle por ID (incluyendo activo y permiso asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detallePermisoActivo.findUnique({ where: { id }, include: { activo: true, permiso: true } });
    if (!detalle) throw new NotFoundError('Detalle de permiso de activo no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un detalle de permiso de activo validando claves y unicidad.
 */
const crear = async (data) => {
  try {
    await validarDetallePermisoActivo(data);
    return await prisma.detallePermisoActivo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un detalle de permiso de activo existente, validando existencia y claves.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detallePermisoActivo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Detalle de permiso de activo no encontrado');
    await validarDetallePermisoActivo(data, id);
    return await prisma.detallePermisoActivo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un detalle de permiso de activo por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detallePermisoActivo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Detalle de permiso de activo no encontrado');
    await prisma.detallePermisoActivo.delete({ where: { id } });
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
