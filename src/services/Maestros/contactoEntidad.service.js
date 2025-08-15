import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para ContactoEntidad
 * Aplica validaciones de referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de entidadComercialId y cargoId (si aplica).
 * Lanza ValidationError según corresponda.
 * @param {Object} data - Datos del contacto
 */
async function validarContactoEntidad(data) {
  // Validar existencia de EntidadComercial
  if (data.entidadComercialId) {
    const existe = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!existe) throw new ValidationError('Entidad comercial no existente.');
  }
  // Validar existencia de Cargo si se provee
  if (data.cargoId) {
    const existeCargo = await prisma.cargosPersonal.findUnique({ where: { id: data.cargoId } });
    if (!existeCargo) throw new ValidationError('Cargo no existente.');
  }
}

/**
 * Lista todos los contactos de entidades comerciales.
 */
const listar = async () => {
  try {
    return await prisma.contactoEntidad.findMany({
      include: {
        entidadComercial: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un contacto por ID (incluyendo la entidad comercial asociada).
 */
const obtenerPorId = async (id) => {
  try {
    const contacto = await prisma.contactoEntidad.findUnique({
      where: { id },
      include: { entidadComercial: true }
    });
    if (!contacto) throw new NotFoundError('Contacto no encontrado');
    return contacto;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene todos los contactos de una entidad comercial específica.
 */
const obtenerPorEntidad = async (entidadComercialId) => {
  try {
    const resultado = await prisma.contactoEntidad.findMany({
      where: { entidadComercialId },
      include: {
        entidadComercial: true
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
 * Crea un contacto validando referencias.
 */
const crear = async (data) => {
  try {
    await validarContactoEntidad(data);
    return await prisma.contactoEntidad.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un contacto existente, validando existencia y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.contactoEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Contacto no encontrado');
    await validarContactoEntidad(data);
    return await prisma.contactoEntidad.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un contacto por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.contactoEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Contacto no encontrado');
    await prisma.contactoEntidad.delete({ where: { id } });
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
