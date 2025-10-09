import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleDocTripulantes
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const promises = [
    prisma.faenaPesca.findUnique({ where: { id: data.faenaPescaId } })
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
  
  if (!faena) throw new ValidationError('El faenaPescaId no existe.');
  if (data.documentoId && !documento) throw new ValidationError('El documentoId no existe.');
  if (data.tripulanteId && !personal) throw new ValidationError('El tripulanteId no existe.');
}

const listar = async (faenaPescaId) => {
  try {
    const where = {};
    if (faenaPescaId) {
      where.faenaPescaId = BigInt(faenaPescaId);
    }
    return await prisma.detalleDocTripulantes.findMany({ where });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detalleDocTripulantes.findUnique({ where: { id } });
    if (!detalle) throw new NotFoundError('DetalleDocTripulantes no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Solo faenaPescaId y verificado son obligatorios
    // documentoId y tripulanteId son opcionales (nullable en el modelo)
    if (!data.faenaPescaId || typeof data.verificado !== 'boolean') {
      throw new ValidationError('Los campos faenaPescaId y verificado son obligatorios.');
    }
    await validarClavesForaneas(data);
    return await prisma.detalleDocTripulantes.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detalleDocTripulantes.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleDocTripulantes no encontrado');
    const claves = ['faenaPescaId', 'documentoPescaId', 'personalId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.detalleDocTripulantes.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detalleDocTripulantes.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleDocTripulantes no encontrado');
    await prisma.detalleDocTripulantes.delete({ where: { id } });
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