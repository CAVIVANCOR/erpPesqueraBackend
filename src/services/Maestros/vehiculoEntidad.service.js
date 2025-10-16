import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para VehiculoEntidad
 * Aplica validaciones de referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de entidadComercialId y tipoVehiculoId.
 * Lanza ValidationError según corresponda.
 * Valida unicidad de placa por entidad comercial.
 * @param {Object} data - Datos del vehículo
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarVehiculoEntidad(data, excluirId = null) {
  // Validar existencia de EntidadComercial
  if (data.entidadComercialId) {
    const existe = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!existe) throw new ValidationError('Entidad comercial no existente.');
  }
  // Validar existencia de TipoVehiculo
  if (data.tipoVehiculoId) {
    const existeTipo = await prisma.tipoVehiculo.findUnique({ where: { id: data.tipoVehiculoId } });
    if (!existeTipo) throw new ValidationError('Tipo de vehículo no existente.');
  }
  // Validar unicidad de placa por entidad comercial
  if (data.placa && data.entidadComercialId) {
    const where = excluirId
      ? { placa: data.placa, entidadComercialId: data.entidadComercialId, id: { not: excluirId } }
      : { placa: data.placa, entidadComercialId: data.entidadComercialId };
    const existePlaca = await prisma.vehiculoEntidad.findFirst({ where });
    if (existePlaca) throw new ConflictError('Ya existe un vehículo con esa placa para la entidad comercial.');
  }
}

/**
 * Lista todos los vehículos de entidades comerciales.
 */
const listar = async () => {
  try {
    return await prisma.vehiculoEntidad.findMany({
      include: {
        entidadComercial: true,
        tipoVehiculo: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un vehículo por ID (incluyendo entidad comercial y tipo de vehículo asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const vehiculo = await prisma.vehiculoEntidad.findUnique({
      where: { id },
      include: { entidadComercial: true, tipoVehiculo: true }
    });
    if (!vehiculo) throw new NotFoundError('Vehículo no encontrado');
    return vehiculo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene todos los vehículos de una entidad comercial específica.
 */
const obtenerPorEntidad = async (entidadComercialId) => {
  try {
    const resultado = await prisma.vehiculoEntidad.findMany({
      where: { entidadComercialId },
      include: {
        entidadComercial: true,
        tipoVehiculo: true
      },
      orderBy: { id: 'desc' }
    });
    return resultado;
  } catch (err) {
    console.error('❌ [SERVICIO] Error en obtenerPorEntidad:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un vehículo validando referencias y unicidad.
 */
const crear = async (data) => {
  try {
    await validarVehiculoEntidad(data);
    // Agregar updatedAt automáticamente
    const dataConFecha = {
      ...data,
      updatedAt: new Date()
    };
    return await prisma.vehiculoEntidad.create({ data: dataConFecha });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un vehículo existente, validando existencia, referencias y unicidad.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.vehiculoEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Vehículo no encontrado');
    await validarVehiculoEntidad(data, id);
    // Agregar updatedAt automáticamente
    const dataConFecha = {
      ...data,
      updatedAt: new Date()
    };
    return await prisma.vehiculoEntidad.update({ where: { id }, data: dataConFecha });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un vehículo por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.vehiculoEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Vehículo no encontrado');
    await prisma.vehiculoEntidad.delete({ where: { id } });
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
  obtenerPorEntidad,
  crear,
  actualizar,
  eliminar
};
