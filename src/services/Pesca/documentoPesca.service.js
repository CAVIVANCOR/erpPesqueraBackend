import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DocumentoPesca
 * Valida campos obligatorios y previene borrado si tiene dependencias asociadas (si aplica).
 * Documentado en español.
 */

const listar = async () => {
  try {
    return await prisma.documentoPesca.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const doc = await prisma.documentoPesca.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError('DocumentoPesca no encontrado');
    return doc;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.nombre || typeof data.obligatorio !== 'boolean') {
      throw new ValidationError('Los campos nombre y obligatorio son obligatorios.');
    }
    return await prisma.documentoPesca.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.documentoPesca.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DocumentoPesca no encontrado');
    return await prisma.documentoPesca.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    // Si existe relación con DocumentacionEmbarcacion, prevenir borrado si tiene dependencias
    const existente = await prisma.documentoPesca.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DocumentoPesca no encontrado');
    // Si se requiere, agregar validación de dependencias aquí
    await prisma.documentoPesca.delete({ where: { id } });
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
