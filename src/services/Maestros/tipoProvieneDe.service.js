import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoProvieneDe
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Lista todos los tipos de proviene de.
 */
const listar = async () => {
  try {
    return await prisma.tipoProvieneDe.findMany({ include: { estados: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo por ID (incluyendo estados asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoProvieneDe.findUnique({ where: { id }, include: { estados: true } });
    if (!tipo) throw new NotFoundError('TipoProvieneDe no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de proviene de.
 */
const crear = async (data) => {
  try {
    return await prisma.tipoProvieneDe.create({ data });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de proviene de existente, validando existencia.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoProvieneDe.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TipoProvieneDe no encontrado');
    return await prisma.tipoProvieneDe.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de proviene de por ID, validando existencia y que no tenga estados asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoProvieneDe.findUnique({ where: { id }, include: { estados: true } });
    if (!existente) throw new NotFoundError('TipoProvieneDe no encontrado');
    if (existente.estados && existente.estados.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene estados asociados.');
    }
    await prisma.tipoProvieneDe.delete({ where: { id } });
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
