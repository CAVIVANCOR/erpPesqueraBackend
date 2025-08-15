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
    const resultado = await prisma.direccionEntidad.findMany({
      include: {
        entidadComercial: true,
        ubigeo: true
      }
    });
    return resultado;
  } catch (err) {
    console.error('❌ [SERVICIO] Error en listar:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una dirección por ID (incluyendo entidad comercial y ubigeo asociados).
 */
const obtenerPorId = async (id) => {
  try {
    const resultado = await prisma.direccionEntidad.findUnique({
      where: { id },
      include: { entidadComercial: true, ubigeo: true }
    });
    if (!resultado) throw new NotFoundError('Dirección no encontrada');
    return resultado;
  } catch (err) {
    console.error('❌ [SERVICIO] Error en obtenerPorId:', err);
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene todas las direcciones de una entidad comercial específica.
 */
const obtenerPorEntidad = async (entidadComercialId) => {
  try {
    const resultado = await prisma.direccionEntidad.findMany({
      where: { entidadComercialId },
      include: {
        entidadComercial: true,
        ubigeo: true
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
 * Obtiene la dirección fiscal de una entidad comercial específica.
 */
const obtenerDireccionFiscalPorEntidad = async (entidadComercialId) => {
  try {
    const whereClause = { 
      entidadComercialId,
      fiscal: true
    };    
    const resultado = await prisma.direccionEntidad.findFirst({
      where: whereClause,
      include: {
        entidadComercial: true,
        ubigeo: true
      }
    });
    return resultado;
  } catch (err) {
    console.error('❌ [SERVICIO] Error en obtenerDireccionFiscalPorEntidad:', err);
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
    const resultado = await prisma.direccionEntidad.create({ data });
    return resultado;
  } catch (err) {
    console.error('❌ [SERVICIO] Error en crear:', err);
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
    const resultado = await prisma.direccionEntidad.update({ where: { id }, data });
    return resultado;
  } catch (err) {
    console.error('❌ [SERVICIO] Error en actualizar:', err);
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
    console.error('❌ [SERVICIO] Error en eliminar:', err);
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerPorEntidad,
  obtenerDireccionFiscalPorEntidad,
  crear,
  actualizar,
  eliminar
};
