import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoEquipo
 * Aplica validaciones de unicidad y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de nombre.
 * Lanza ValidationError si ya existe.
 * @param {Object} data - Datos del tipo de equipo
 * @param {BigInt} [id] - ID del registro a excluir (para update)
 */
async function validarTipoEquipo(data, id = null) {
  if (data.nombre !== undefined && data.nombre !== null) {
    const where = id ? { nombre: data.nombre, NOT: { id } } : { nombre: data.nombre };
    const existe = await prisma.tipoEquipo.findFirst({ where });
    if (existe) throw new ValidationError('El nombre ya está registrado para otro tipo de equipo.');
  }
}

/**
 * Lista todos los tipos de equipo.
 */
const listar = async () => {
  try {
    return await prisma.tipoEquipo.findMany({ include: { accesos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de equipo por ID (incluyendo accesos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoEquipo.findUnique({ where: { id }, include: { accesos: true } });
    if (!tipo) throw new NotFoundError('TipoEquipo no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de equipo validando unicidad de nombre.
 */
const crear = async (data) => {
  try {
    if (!data.nombre) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    await validarTipoEquipo(data);
    return await prisma.tipoEquipo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de equipo existente, validando existencia y unicidad de nombre.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoEquipo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TipoEquipo no encontrado');
    if (data.nombre !== undefined && (!data.nombre || data.nombre.trim() === '')) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    await validarTipoEquipo(data, id);
    return await prisma.tipoEquipo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de equipo por ID, validando existencia y que no tenga accesos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoEquipo.findUnique({ where: { id }, include: { accesos: true } });
    if (!existente) throw new NotFoundError('TipoEquipo no encontrado');
    if (existente.accesos && existente.accesos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene accesos asociados.');
    }
    await prisma.tipoEquipo.delete({ where: { id } });
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
