import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DocumentacionPersonal
 * Aplica validaciones de referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de personalId y documentoPescaId.
 * Lanza ValidationError si alguna referencia no existe.
 * @param {Object} data - Datos de la documentación
 */
async function validarReferencias(data) {
  // Validar existencia de Personal
  if (data.personalId) {
    const personal = await prisma.personal.findUnique({ where: { id: data.personalId } });
    if (!personal) throw new ValidationError('Personal no existente.');
  }
  // Validar existencia de DocumentoPesca
  if (data.documentoPescaId) {
    const doc = await prisma.documentoPesca.findUnique({ where: { id: data.documentoPescaId } });
    if (!doc) throw new ValidationError('Documento de pesca no existente.');
  }
}

/**
 * Lista todas las documentaciones personales, incluyendo personal asociado.
 */
const listar = async () => {
  try {
    return await prisma.documentacionPersonal.findMany({ include: { personal: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una documentación personal por ID (incluyendo personal asociado).
 */
const obtenerPorId = async (id) => {
  try {
    const doc = await prisma.documentacionPersonal.findUnique({ where: { id }, include: { personal: true } });
    if (!doc) throw new NotFoundError('Documentación personal no encontrada');
    return doc;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una documentación personal validando referencias.
 */
const crear = async (data) => {
  try {
    await validarReferencias(data);
    return await prisma.documentacionPersonal.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una documentación personal existente, validando existencia y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.documentacionPersonal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Documentación personal no encontrada');
    await validarReferencias(data);
    return await prisma.documentacionPersonal.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una documentación personal por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.documentacionPersonal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Documentación personal no encontrada');
    await prisma.documentacionPersonal.delete({ where: { id } });
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
