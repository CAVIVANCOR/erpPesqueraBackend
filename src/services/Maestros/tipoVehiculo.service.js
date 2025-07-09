import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoVehiculo
 * Aplica validaciones de unicidad, relaciones y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de nombre.
 * Lanza ConflictError si ya existe un tipo de vehículo con ese nombre.
 * @param {Object} data - Datos del tipo de vehículo
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarTipoVehiculo(data, excluirId = null) {
  if (data.nombre) {
    const where = excluirId ? { nombre: data.nombre, id: { not: excluirId } } : { nombre: data.nombre };
    const existe = await prisma.tipoVehiculo.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un tipo de vehículo con ese nombre.');
  }
}

/**
 * Lista todos los tipos de vehículo.
 */
const listar = async () => {
  try {
    return await prisma.tipoVehiculo.findMany({ include: { vehiculos: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de vehículo por ID (incluyendo vehículos asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoVehiculo.findUnique({ where: { id }, include: { vehiculos: true } });
    if (!tipo) throw new NotFoundError('Tipo de vehículo no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de vehículo validando unicidad.
 */
const crear = async (data) => {
  try {
    await validarTipoVehiculo(data);
    return await prisma.tipoVehiculo.create({ data });
  } catch (err) {
    if (err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de vehículo existente, validando existencia y unicidad.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoVehiculo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de vehículo no encontrado');
    await validarTipoVehiculo(data, id);
    return await prisma.tipoVehiculo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de vehículo por ID, validando existencia y que no tenga vehículos asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoVehiculo.findUnique({ where: { id }, include: { vehiculos: true } });
    if (!existente) throw new NotFoundError('Tipo de vehículo no encontrado');
    if (existente.vehiculos && existente.vehiculos.length > 0) {
      throw new ConflictError('No se puede eliminar el tipo de vehículo porque tiene vehículos asociados.');
    }
    await prisma.tipoVehiculo.delete({ where: { id } });
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
