import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DocumentacionEmbarcacion
 * Valida existencia de claves foráneas y unicidad de la combinación embarcacionId-documentoPescaId.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [embarcacion, documento] = await Promise.all([
    prisma.embarcacion.findUnique({ where: { id: data.embarcacionId } }),
    prisma.documentoPesca.findUnique({ where: { id: data.documentoPescaId } })
  ]);
  if (!embarcacion) throw new ValidationError('El embarcacionId no existe.');
  if (!documento) throw new ValidationError('El documentoPescaId no existe.');
}

async function validarUnicidad(embarcacionId, documentoPescaId, id = null) {
  const where = id
    ? { embarcacionId, documentoPescaId, NOT: { id } }
    : { embarcacionId, documentoPescaId };
  const existe = await prisma.documentacionEmbarcacion.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe una documentación para esa embarcación y documento.');
}

const listar = async () => {
  try {
    return await prisma.documentacionEmbarcacion.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const doc = await prisma.documentacionEmbarcacion.findUnique({ where: { id } });
    if (!doc) throw new NotFoundError('DocumentacionEmbarcacion no encontrada');
    return doc;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.embarcacionId || !data.documentoPescaId) {
      throw new ValidationError('Los campos embarcacionId y documentoPescaId son obligatorios.');
    }
    await validarClavesForaneas(data);
    await validarUnicidad(data.embarcacionId, data.documentoPescaId);
    return await prisma.documentacionEmbarcacion.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.documentacionEmbarcacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DocumentacionEmbarcacion no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['embarcacionId','documentoPescaId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
      await validarUnicidad(
        data.embarcacionId || existente.embarcacionId,
        data.documentoPescaId || existente.documentoPescaId,
        id
      );
    }
    return await prisma.documentacionEmbarcacion.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.documentacionEmbarcacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DocumentacionEmbarcacion no encontrada');
    await prisma.documentacionEmbarcacion.delete({ where: { id } });
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
