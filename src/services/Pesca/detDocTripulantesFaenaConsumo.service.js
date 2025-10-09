import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetDocTripulantesFaenaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const promises = [
    prisma.faenaPescaConsumo.findUnique({ where: { id: data.faenaPescaConsumoId } })
  ];
  
  // Solo validar documentoId si no es null/undefined
  if (data.documentoId !== null && data.documentoId !== undefined) {
    promises.push(prisma.documentoPesca.findUnique({ where: { id: data.documentoId } }));
  } else {
    promises.push(Promise.resolve(true)); // Placeholder
  }
  
  // Solo validar tripulanteId si no es null/undefined
  if (data.tripulanteId !== null && data.tripulanteId !== undefined) {
    promises.push(prisma.personal.findUnique({ where: { id: data.tripulanteId } }));
  } else {
    promises.push(Promise.resolve(true)); // Placeholder
  }
  
  const [faena, documento, personal] = await Promise.all(promises);
  
  if (!faena) throw new ValidationError('El faenaPescaConsumoId no existe.');
  if (data.documentoId && !documento) throw new ValidationError('El documentoId no existe.');
  if (data.tripulanteId && !personal) throw new ValidationError('El tripulanteId no existe.');
}

const listar = async (faenaPescaConsumoId) => {
  try {
    const where = {};
    if (faenaPescaConsumoId) {
      where.faenaPescaConsumoId = BigInt(faenaPescaConsumoId);
    }
    return await prisma.detDocTripulantesFaenaConsumo.findMany({ where });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detDocTripulantesFaenaConsumo.findUnique({ where: { id } });
    if (!detalle) throw new NotFoundError('DetDocTripulantesFaenaConsumo no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Solo faenaPescaConsumoId y verificado son obligatorios
    // documentoId y tripulanteId son opcionales (nullable en el modelo)
    if (!data.faenaPescaConsumoId || typeof data.verificado !== 'boolean') {
      throw new ValidationError('Los campos faenaPescaConsumoId y verificado son obligatorios.');
    }
    await validarClavesForaneas(data);
    return await prisma.detDocTripulantesFaenaConsumo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detDocTripulantesFaenaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetDocTripulantesFaenaConsumo no encontrado');
    const claves = ['faenaPescaConsumoId', 'documentoPescaId', 'personalId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.detDocTripulantesFaenaConsumo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detDocTripulantesFaenaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetDocTripulantesFaenaConsumo no encontrado');
    await prisma.detDocTripulantesFaenaConsumo.delete({ where: { id } });
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