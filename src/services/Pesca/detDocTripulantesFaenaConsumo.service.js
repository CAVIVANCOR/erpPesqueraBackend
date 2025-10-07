import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetDocTripulantesFaenaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [faena, personal, documento] = await Promise.all([
    prisma.faenaPescaConsumo.findUnique({ where: { id: data.faenaPescaConsumoId } }),
    data.tripulanteId ? prisma.personal.findUnique({ where: { id: data.tripulanteId } }) : true, // ← CAMBIAR a personal
    data.documentoId ? prisma.documentoPesca.findUnique({ where: { id: data.documentoId } }) : true
  ]);
  if (!faena) throw new ValidationError('El faenaPescaConsumoId no existe.');
  if (data.tripulanteId && !personal) throw new ValidationError('El tripulanteId no existe.');
  if (data.documentoId && !documento) throw new ValidationError('El documentoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.detDocTripulantesFaenaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detDocTripulantesFaenaConsumo.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('DetDocTripulantesFaenaConsumo no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (typeof data.faenaPescaConsumoId === 'undefined' || data.faenaPescaConsumoId === null) {
      throw new ValidationError('El campo faenaPescaConsumoId es obligatorio.');
    }
    await validarClavesForaneas(data);
    
    // Agregar updatedAt automáticamente
    const dataConFecha = {
      ...data,
      updatedAt: new Date()
    };
    
    return await prisma.detDocTripulantesFaenaConsumo.create({ data: dataConFecha });
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
    // Validar claves foráneas si cambian
    const claves = ['faenaPescaConsumoId','tripulanteId','documentoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    
    // Agregar updatedAt automáticamente
    const dataConFecha = {
      ...data,
      updatedAt: new Date()
    };
    
    return await prisma.detDocTripulantesFaenaConsumo.update({ where: { id }, data: dataConFecha });
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
