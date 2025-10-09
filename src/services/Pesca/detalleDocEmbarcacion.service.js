import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleDocEmbarcacion
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [faena, documento] = await Promise.all([
    prisma.faenaPesca.findUnique({ where: { id: data.faenaPescaId } }),
    prisma.documentoPesca.findUnique({ where: { id: data.documentoPescaId } })
  ]);
  if (!faena) throw new ValidationError('El faenaPescaId no existe.');
  if (!documento) throw new ValidationError('El documentoPescaId no existe.');
}

const listar = async (faenaPescaId) => {
  try {
    const where = {};
    if (faenaPescaId) {
      where.faenaPescaId = BigInt(faenaPescaId);
    }
    return await prisma.detalleDocEmbarcacion.findMany({ where });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detalleDocEmbarcacion.findUnique({ where: { id } });
    if (!detalle) throw new NotFoundError('DetalleDocEmbarcacion no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.faenaPescaId || !data.documentoPescaId || typeof data.verificado !== 'boolean') {
      throw new ValidationError('Los campos faenaPescaId, documentoPescaId y verificado son obligatorios.');
    }
    await validarClavesForaneas(data);
    return await prisma.detalleDocEmbarcacion.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detalleDocEmbarcacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleDocEmbarcacion no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['faenaPescaId','documentoPescaId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.detalleDocEmbarcacion.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detalleDocEmbarcacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleDocEmbarcacion no encontrado');
    await prisma.detalleDocEmbarcacion.delete({ where: { id } });
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