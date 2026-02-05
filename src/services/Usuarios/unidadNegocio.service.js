import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para UnidadNegocio
 * Aplica validaciones de unicidad y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de nombre.
 * Lanza ConflictError si ya existe una unidad con el mismo nombre.
 * @param {Object} data - Datos de la unidad de negocio
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarUnidadNegocio(data, excluirId = null) {
  if (data.nombre) {
    const where = excluirId ? { nombre: data.nombre, id: { not: excluirId } } : { nombre: data.nombre };
    const existe = await prisma.unidadNegocio.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe una unidad de negocio con ese nombre.');
  }
}

/**
 * Lista todas las unidades de negocio.
 * @param {Object} filtros - Filtros opcionales
 * @param {boolean} filtros.activo - Filtrar por estado activo
 */
const listar = async (filtros = {}) => {
  try {
    const where = {};
    
    if (filtros.activo !== undefined) {
      where.activo = filtros.activo;
    }
    
    return await prisma.unidadNegocio.findMany({
      where,
      orderBy: { orden: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una unidad de negocio por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const unidad = await prisma.unidadNegocio.findUnique({ where: { id } });
    if (!unidad) throw new NotFoundError('Unidad de negocio no encontrada');
    return unidad;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una unidad de negocio validando unicidad.
 */
const crear = async (data) => {
  try {
    await validarUnidadNegocio(data);
    return await prisma.unidadNegocio.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una unidad de negocio existente, validando existencia y unicidad.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.unidadNegocio.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Unidad de negocio no encontrada');
    await validarUnidadNegocio(data, id);
    return await prisma.unidadNegocio.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una unidad de negocio por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.unidadNegocio.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Unidad de negocio no encontrada');
    
    // Verificar si tiene registros asociados
    const [
      cotizaciones,
      preFacturas,
      requerimientos,
      ordenes,
      movimientos,
      novedades,
      temporadas,
      contratos
    ] = await Promise.all([
      prisma.cotizacionVentas.count({ where: { unidadNegocioId: id } }),
      prisma.preFactura.count({ where: { unidadNegocioId: id } }),
      prisma.requerimientoCompra.count({ where: { unidadNegocioId: id } }),
      prisma.ordenCompra.count({ where: { unidadNegocioId: id } }),
      prisma.movimientoAlmacen.count({ where: { unidadNegocioId: id } }),
      prisma.novedadPescaConsumo.count({ where: { unidadNegocioId: id } }),
      prisma.temporadaPesca.count({ where: { unidadNegocioId: id } }),
      prisma.contratoServicio.count({ where: { unidadNegocioId: id } })
    ]);
    
    const totalAsociados = cotizaciones + preFacturas + requerimientos + ordenes + 
                          movimientos + novedades + temporadas + contratos;
    
    if (totalAsociados > 0) {
      throw new ConflictError('No se puede eliminar la unidad de negocio porque tiene registros asociados.');
    }
    
    await prisma.unidadNegocio.delete({ where: { id } });
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