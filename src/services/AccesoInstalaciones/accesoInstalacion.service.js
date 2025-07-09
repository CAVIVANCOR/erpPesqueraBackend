import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para AccesoInstalacion
 * Aplica validaciones de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales (sedeId y tipoAccesoId).
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {BigInt} sedeId
 * @param {BigInt} tipoAccesoId
 */
async function validarForaneas(sedeId, tipoAccesoId) {
  const sede = await prisma.sedesEmpresa.findUnique({ where: { id: sedeId } });
  if (!sede) throw new ValidationError('La sede referenciada no existe.');
  const tipoAcceso = await prisma.tipoAccesoInstalacion.findUnique({ where: { id: tipoAccesoId } });
  if (!tipoAcceso) throw new ValidationError('El tipo de acceso referenciado no existe.');
}

/**
 * Lista todos los accesos a instalaciones.
 */
const listar = async () => {
  try {
    return await prisma.accesoInstalacion.findMany({ include: { detalles: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un acceso a instalación por ID (incluyendo detalles asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const acceso = await prisma.accesoInstalacion.findUnique({ where: { id }, include: { detalles: true } });
    if (!acceso) throw new NotFoundError('AccesoInstalacion no encontrado');
    return acceso;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un acceso a instalación validando existencia de claves foráneas principales y campos obligatorios.
 */
const crear = async (data) => {
  try {
    if (!data.sedeId || !data.tipoAccesoId || !data.fechaHora) {
      throw new ValidationError('Los campos sedeId, tipoAccesoId y fechaHora son obligatorios.');
    }
    await validarForaneas(data.sedeId, data.tipoAccesoId);
    return await prisma.accesoInstalacion.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un acceso a instalación existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.accesoInstalacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('AccesoInstalacion no encontrado');
    if (data.sedeId !== undefined && data.sedeId !== null) {
      await validarForaneas(data.sedeId, data.tipoAccesoId ?? existente.tipoAccesoId);
    } else if (data.tipoAccesoId !== undefined && data.tipoAccesoId !== null) {
      await validarForaneas(existente.sedeId, data.tipoAccesoId);
    }
    return await prisma.accesoInstalacion.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un acceso a instalación por ID, validando existencia y que no tenga detalles asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.accesoInstalacion.findUnique({ where: { id }, include: { detalles: true } });
    if (!existente) throw new NotFoundError('AccesoInstalacion no encontrado');
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.accesoInstalacion.delete({ where: { id } });
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
