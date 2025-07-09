import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetPermisoGestionadoOT
 * Aplica validaciones de existencia de claves foráneas principales.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del permiso gestionado
 */
async function validarForaneas(data) {
  // otMantenimientoId
  if (data.otMantenimientoId !== undefined && data.otMantenimientoId !== null) {
    const ot = await prisma.oTMantenimiento.findUnique({ where: { id: data.otMantenimientoId } });
    if (!ot) throw new ValidationError('La OT de mantenimiento referenciada no existe.');
  }
  // permisoId (ajustar el modelo si es necesario)
  if (data.permisoId !== undefined && data.permisoId !== null) {
    const permiso = await prisma.permiso.findUnique({ where: { id: data.permisoId } });
    if (!permiso) throw new ValidationError('El permiso referenciado no existe.');
  }
}

/**
 * Lista todos los permisos gestionados de OT.
 */
const listar = async () => {
  try {
    return await prisma.detPermisoGestionadoOT.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un permiso gestionado por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detPermisoGestionadoOT.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('DetPermisoGestionadoOT no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un permiso gestionado validando existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.otMantenimientoId || !data.permisoId) {
      throw new ValidationError('Los campos otMantenimientoId y permisoId son obligatorios.');
    }
    await validarForaneas(data);
    return await prisma.detPermisoGestionadoOT.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un permiso gestionado existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detPermisoGestionadoOT.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetPermisoGestionadoOT no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.detPermisoGestionadoOT.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un permiso gestionado por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detPermisoGestionadoOT.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetPermisoGestionadoOT no encontrado');
    await prisma.detPermisoGestionadoOT.delete({ where: { id } });
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
