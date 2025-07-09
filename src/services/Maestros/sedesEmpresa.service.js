import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para SedesEmpresa
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de empresaId en Empresa.
 * Lanza ValidationError si la empresa no existe.
 * @param {Object} data - Datos de la sede
 */
async function validarSede(data) {
  if (data.empresaId !== undefined && data.empresaId !== null) {
    const existe = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!existe) throw new ValidationError('Empresa no existente para el campo empresaId.');
  }
}

/**
 * Lista todas las sedes de empresa.
 */
const listar = async () => {
  try {
    return await prisma.sedesEmpresa.findMany({ include: { empresa: true, areasFisicas: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una sede de empresa por ID (incluyendo empresa y áreas físicas asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const sede = await prisma.sedesEmpresa.findUnique({ where: { id }, include: { empresa: true, areasFisicas: true } });
    if (!sede) throw new NotFoundError('Sede de empresa no encontrada');
    return sede;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una sede de empresa validando empresaId.
 */
const crear = async (data) => {
  try {
    await validarSede(data);
    return await prisma.sedesEmpresa.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una sede de empresa existente, validando existencia y empresaId.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.sedesEmpresa.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Sede de empresa no encontrada');
    await validarSede(data);
    return await prisma.sedesEmpresa.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una sede de empresa por ID, validando existencia y que no tenga áreas físicas asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.sedesEmpresa.findUnique({ where: { id }, include: { areasFisicas: true } });
    if (!existente) throw new NotFoundError('Sede de empresa no encontrada');
    if (existente.areasFisicas && existente.areasFisicas.length > 0) {
      throw new ConflictError('No se puede eliminar la sede porque tiene áreas físicas asociadas.');
    }
    await prisma.sedesEmpresa.delete({ where: { id } });
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
