import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError } from '../../utils/errors.js';

/**
 * Servicio CRUD para MotivoSinFaena
 * Aplica validaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Lista todos los motivos sin faena.
 */
const listar = async () => {
  try {
    return await prisma.motivoSinFaena.findMany({
      orderBy: { id: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un motivo sin faena por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const motivo = await prisma.motivoSinFaena.findUnique({ where: { id } });
    if (!motivo) throw new NotFoundError('Motivo sin faena no encontrado');
    return motivo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un motivo sin faena.
 */
const crear = async (data) => {
  try {
    return await prisma.motivoSinFaena.create({ data });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un motivo sin faena existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.motivoSinFaena.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Motivo sin faena no encontrado');
    return await prisma.motivoSinFaena.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un motivo sin faena por ID.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.motivoSinFaena.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Motivo sin faena no encontrado');
    await prisma.motivoSinFaena.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista motivos sin faena activos (no cesados).
 */
const listarActivos = async () => {
  try {
    return await prisma.motivoSinFaena.findMany({
      where: { activo: true },
      orderBy: { id: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarActivos
};