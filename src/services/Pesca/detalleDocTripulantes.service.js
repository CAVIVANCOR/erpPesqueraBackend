import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleDocTripulantes
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  // faenaPescaId es requerido
  const faenaPesca = await prisma.faenaPesca.findUnique({ where: { id: data.faenaPescaId } });
  if (!faenaPesca) throw new ValidationError('El faenaPescaId no existe.');
  // tripulanteId y documentoId son opcionales
  if (data.tripulanteId) {
    const tripulante = await prisma.tripulante.findUnique({ where: { id: data.tripulanteId } });
    if (!tripulante) throw new ValidationError('El tripulanteId no existe.');
  }
  if (data.documentoId) {
    const documento = await prisma.documento.findUnique({ where: { id: data.documentoId } });
    if (!documento) throw new ValidationError('El documentoId no existe.');
  }
}

const listar = async () => {
  try {
    return await prisma.detalleDocTripulantes.findMany();
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
    if (!data.faenaPescaId) throw new ValidationError('El campo faenaPescaId es obligatorio.');
    if (typeof data.verificado !== 'boolean') throw new ValidationError('El campo verificado es obligatorio y debe ser boolean.');
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
    // Validar claves foráneas si cambian
    const claves = ['faenaPescaId','tripulanteId','documentoId'];
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
