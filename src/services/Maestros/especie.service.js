import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Especie
 * Aplica validaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Lista todas las especies.
 */
const listar = async () => {
  try {
    return await prisma.especie.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una especie por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const especie = await prisma.especie.findUnique({ where: { id } });
    if (!especie) throw new NotFoundError('Especie no encontrada');
    return especie;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una especie.
 */
const crear = async (data) => {
  try {
    if (!data.nombre || data.nombre.trim() === '') {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    return await prisma.especie.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una especie existente, validando existencia.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.especie.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Especie no encontrada');
    if (data.nombre !== undefined && (!data.nombre || data.nombre.trim() === '')) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    return await prisma.especie.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una especie por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.especie.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Especie no encontrada');
    await prisma.especie.delete({ where: { id } });
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
