import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoMaterial
 * Aplica validaciones de relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Lista todos los tipos de material.
 */
const listar = async () => {
  try {
    return await prisma.tipoMaterial.findMany({ include: { productos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de material por ID (incluyendo productos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoMaterial.findUnique({ where: { id }, include: { productos: true } });
    if (!tipo) throw new NotFoundError('Tipo de material no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de material.
 */
const crear = async (data) => {
  try {
    return await prisma.tipoMaterial.create({ data });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de material existente, validando existencia.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoMaterial.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de material no encontrado');
    return await prisma.tipoMaterial.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de material por ID, validando existencia y que no tenga productos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoMaterial.findUnique({ where: { id }, include: { productos: true } });
    if (!existente) throw new NotFoundError('Tipo de material no encontrado');
    if (existente.productos && existente.productos.length > 0) {
      throw new ConflictError('No se puede eliminar el tipo de material porque tiene productos asociados.');
    }
    await prisma.tipoMaterial.delete({ where: { id } });
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
