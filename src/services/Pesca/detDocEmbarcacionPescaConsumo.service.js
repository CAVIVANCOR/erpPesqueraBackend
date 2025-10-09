import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetDocEmbarcacionPescaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [faena, documento] = await Promise.all([
    prisma.faenaPescaConsumo.findUnique({ where: { id: data.faenaPescaConsumoId } }),
    prisma.documentoPesca.findUnique({ where: { id: data.documentoPescaId } })
  ]);
  if (!faena) throw new ValidationError('El faenaPescaConsumoId no existe.');
  if (!documento) throw new ValidationError('El documentoPescaId no existe.');
}

const listar = async (faenaPescaConsumoId) => {
  try {
    const where = {};
    if (faenaPescaConsumoId) {
      where.faenaPescaConsumoId = BigInt(faenaPescaConsumoId);
    }
    return await prisma.detDocEmbarcacionPescaConsumo.findMany({ where });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detDocEmbarcacionPescaConsumo.findUnique({ where: { id } });
    if (!detalle) throw new NotFoundError('DetDocEmbarcacionPescaConsumo no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.faenaPescaConsumoId || !data.documentoPescaId || typeof data.verificado !== 'boolean') {
      throw new ValidationError('Los campos faenaPescaConsumoId, documentoPescaId y verificado son obligatorios.');
    }
    await validarClavesForaneas(data);
    return await prisma.detDocEmbarcacionPescaConsumo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detDocEmbarcacionPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetDocEmbarcacionPescaConsumo no encontrado');
    const claves = ['faenaPescaConsumoId', 'documentoPescaId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.detDocEmbarcacionPescaConsumo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detDocEmbarcacionPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetDocEmbarcacionPescaConsumo no encontrado');
    await prisma.detDocEmbarcacionPescaConsumo.delete({ where: { id } });
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