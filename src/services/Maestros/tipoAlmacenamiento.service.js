import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoAlmacenamiento
 * Aplica validaciones de unicidad y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de nombre.
 * Lanza ValidationError si ya existe.
 * @param {Object} data - Datos del tipo de almacenamiento
 * @param {BigInt} [id] - ID del registro a excluir (para update)
 */
async function validarTipoAlmacenamiento(data, id = null) {
  if (data.nombre !== undefined && data.nombre !== null) {
    const where = id ? { nombre: data.nombre, NOT: { id } } : { nombre: data.nombre };
    const existe = await prisma.tipoAlmacenamiento.findFirst({ where });
    if (existe) throw new ValidationError('El nombre ya está registrado para otro tipo de almacenamiento.');
  }
}

/**
 * Lista todos los tipos de almacenamiento.
 */
const listar = async () => {
  try {
    return await prisma.tipoAlmacenamiento.findMany({ include: { productos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de almacenamiento por ID (incluyendo productos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoAlmacenamiento.findUnique({ where: { id }, include: { productos: true } });
    if (!tipo) throw new NotFoundError('Tipo de almacenamiento no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de almacenamiento validando unicidad de nombre.
 */
const crear = async (data) => {
  try {
    if (!data.nombre) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    await validarTipoAlmacenamiento(data);
    return await prisma.tipoAlmacenamiento.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de almacenamiento existente, validando existencia y unicidad de nombre.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoAlmacenamiento.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de almacenamiento no encontrado');
    if (data.nombre !== undefined && (!data.nombre || data.nombre.trim() === '')) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    await validarTipoAlmacenamiento(data, id);
    return await prisma.tipoAlmacenamiento.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de almacenamiento por ID, validando existencia y que no tenga productos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoAlmacenamiento.findUnique({ where: { id }, include: { productos: true } });
    if (!existente) throw new NotFoundError('Tipo de almacenamiento no encontrado');
    if (existente.productos && existente.productos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene productos asociados.');
    }
    await prisma.tipoAlmacenamiento.delete({ where: { id } });
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
