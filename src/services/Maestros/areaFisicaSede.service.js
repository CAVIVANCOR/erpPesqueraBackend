import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para AreaFisicaSede
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de sedeId en SedesEmpresa.
 * Lanza ValidationError si la sede no existe.
 * @param {Object} data - Datos del área física
 */
async function validarAreaFisica(data) {
  if (data.sedeId !== undefined && data.sedeId !== null) {
    const existe = await prisma.sedesEmpresa.findUnique({ where: { id: data.sedeId } });
    if (!existe) throw new ValidationError('Sede de empresa no existente para el campo sedeId.');
  }
}

/**
 * Lista todas las áreas físicas de sede.
 */
const listar = async () => {
  try {
    return await prisma.areaFisicaSede.findMany({ include: { sede: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un área física por ID (incluyendo la sede asociada).
 */
const obtenerPorId = async (id) => {
  try {
    const area = await prisma.areaFisicaSede.findUnique({ where: { id }, include: { sede: true } });
    if (!area) throw new NotFoundError('Área física de sede no encontrada');
    return area;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un área física de sede validando sedeId.
 */
const crear = async (data) => {
  try {
    await validarAreaFisica(data);
    return await prisma.areaFisicaSede.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un área física de sede existente, validando existencia y sedeId.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.areaFisicaSede.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Área física de sede no encontrada');
    await validarAreaFisica(data);
    return await prisma.areaFisicaSede.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un área física de sede por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.areaFisicaSede.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Área física de sede no encontrada');
    await prisma.areaFisicaSede.delete({ where: { id } });
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
