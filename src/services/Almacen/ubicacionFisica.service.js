import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para UbicacionFisica
 * Aplica validaciones de unicidad, referencias foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de descripción por almacén y existencia de referencias foráneas.
 * Lanza ConflictError o ValidationError según corresponda.
 * @param {Object} data - Datos de la ubicación física
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarUbicacionFisica(data, excluirId = null) {
  // Validar unicidad de descripción por almacén
  if (data.descripcion && data.almacenId) {
    const where = excluirId ? {
      descripcion: data.descripcion,
      almacenId: data.almacenId,
      id: { not: excluirId }
    } : {
      descripcion: data.descripcion,
      almacenId: data.almacenId
    };
    const existe = await prisma.ubicacionFisica.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe una ubicación física con esa descripción en el almacén.');
  }

  // Validar existencia de Almacén
  if (data.almacenId) {
    const almacen = await prisma.almacen.findUnique({ where: { id: data.almacenId } });
    if (!almacen) throw new ValidationError('Almacén no existente.');
  }
}

/**
 * Lista todas las ubicaciones físicas, incluyendo relaciones principales.
 * @param {Object} filtros - Filtros opcionales para la consulta
 * @param {number} filtros.almacenId - ID del almacén para filtrar
 */
const listar = async (filtros = {}) => {
  try {
    const where = {};
    
    if (filtros.almacenId) {
      where.almacenId = filtros.almacenId;
    }
    
    const ubicaciones = await prisma.ubicacionFisica.findMany({
      where,
      include: {
        almacen: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: [
        { almacenId: 'asc' },
        { descripcion: 'asc' }
      ]
    });

    return ubicaciones;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una ubicación física por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const ubicacion = await prisma.ubicacionFisica.findUnique({
      where: { id },
      include: {
        almacen: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });
    if (!ubicacion) throw new NotFoundError('Ubicación física no encontrada');
    return ubicacion;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un registro de ubicación física validando unicidad y referencias.
 */
const crear = async (data) => {
  try {
    await validarUbicacionFisica(data);
    return await prisma.ubicacionFisica.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un registro de ubicación física existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.ubicacionFisica.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Ubicación física no encontrada');
    await validarUbicacionFisica(data, id);
    return await prisma.ubicacionFisica.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un registro de ubicación física por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.ubicacionFisica.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Ubicación física no encontrada');
    
    // Validar que no esté siendo usada (ID 1 es la ubicación por defecto)
    if (id === 1n || id === 1) {
      throw new ValidationError('No se puede eliminar la ubicación física por defecto.');
    }
    
    await prisma.ubicacionFisica.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
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
