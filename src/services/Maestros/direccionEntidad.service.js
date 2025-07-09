import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DireccionEntidad
 * Aplica validaciones de referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de entidadComercialId y ubigeoId.
 * Lanza ValidationError según corresponda.
 * @param {Object} data - Datos de la dirección
 */
async function validarDireccionEntidad(data) {
  // Validar existencia de EntidadComercial
  if (data.entidadComercialId) {
    const existe = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!existe) throw new ValidationError('Entidad comercial no existente.');
  }
  // Validar existencia de Ubigeo
  if (data.ubigeoId) {
    const existeUbigeo = await prisma.ubigeo.findUnique({ where: { id: data.ubigeoId } });
    if (!existeUbigeo) throw new ValidationError('Ubigeo no existente.');
  }
}

/**
 * Lista todas las direcciones de entidades comerciales.
 */
const listar = async () => {
  try {
    return await prisma.direccionEntidad.findMany({
      include: {
        entidadComercial: true,
        ubigeo: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una dirección por ID (incluyendo entidad comercial y ubigeo asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const direccion = await prisma.direccionEntidad.findUnique({
      where: { id },
      include: { entidadComercial: true, ubigeo: true }
    });
    if (!direccion) throw new NotFoundError('Dirección no encontrada');
    return direccion;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una dirección validando referencias.
 */
const crear = async (data) => {
  try {
    await validarDireccionEntidad(data);
    return await prisma.direccionEntidad.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una dirección existente, validando existencia y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.direccionEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Dirección no encontrada');
    await validarDireccionEntidad(data);
    return await prisma.direccionEntidad.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una dirección por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.direccionEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Dirección no encontrada');
    await prisma.direccionEntidad.delete({ where: { id } });
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
