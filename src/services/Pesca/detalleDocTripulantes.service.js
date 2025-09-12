import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleDocTripulantes
 * Documentado en español.
 */

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
