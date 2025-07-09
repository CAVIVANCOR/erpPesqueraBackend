import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para AccesoInstalacionDetalle
 * Aplica validaciones de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales (accesoInstalacionId y tipoMovimientoId).
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {BigInt} accesoInstalacionId
 * @param {BigInt} tipoMovimientoId
 */
async function validarForaneas(accesoInstalacionId, tipoMovimientoId) {
  const acceso = await prisma.accesoInstalacion.findUnique({ where: { id: accesoInstalacionId } });
  if (!acceso) throw new ValidationError('El acceso a instalación referenciado no existe.');
  const tipoMov = await prisma.tipoMovimientoAcceso.findUnique({ where: { id: tipoMovimientoId } });
  if (!tipoMov) throw new ValidationError('El tipo de movimiento referenciado no existe.');
}

/**
 * Lista todos los detalles de acceso a instalación.
 */
const listar = async () => {
  try {
    return await prisma.accesoInstalacionDetalle.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un detalle por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.accesoInstalacionDetalle.findUnique({ where: { id } });
    if (!detalle) throw new NotFoundError('AccesoInstalacionDetalle no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un detalle validando existencia de claves foráneas principales y campos obligatorios.
 */
const crear = async (data) => {
  try {
    if (!data.accesoInstalacionId || !data.fechaHora || !data.tipoMovimientoId) {
      throw new ValidationError('Los campos accesoInstalacionId, fechaHora y tipoMovimientoId son obligatorios.');
    }
    await validarForaneas(data.accesoInstalacionId, data.tipoMovimientoId);
    return await prisma.accesoInstalacionDetalle.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un detalle existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.accesoInstalacionDetalle.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('AccesoInstalacionDetalle no encontrado');
    if (data.accesoInstalacionId !== undefined && data.accesoInstalacionId !== null) {
      await validarForaneas(data.accesoInstalacionId, data.tipoMovimientoId ?? existente.tipoMovimientoId);
    } else if (data.tipoMovimientoId !== undefined && data.tipoMovimientoId !== null) {
      await validarForaneas(existente.accesoInstalacionId, data.tipoMovimientoId);
    }
    return await prisma.accesoInstalacionDetalle.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un detalle por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.accesoInstalacionDetalle.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('AccesoInstalacionDetalle no encontrado');
    await prisma.accesoInstalacionDetalle.delete({ where: { id } });
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
