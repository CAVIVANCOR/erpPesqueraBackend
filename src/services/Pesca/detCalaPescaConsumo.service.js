import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetCalaPescaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [cala, especie] = await Promise.all([
    prisma.calaFaenaConsumo.findUnique({ where: { id: data.calaFaenaConsumoId } }),
    prisma.especie.findUnique({ where: { id: data.especieId } })
  ]);
  if (!cala) throw new ValidationError('El calaFaenaConsumoId no existe.');
  if (!especie) throw new ValidationError('El especieId no existe.');
}

const listar = async () => {
  try {
    return await prisma.detCalaPescaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detCalaPescaConsumo.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('DetCalaPescaConsumo no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['calaFaenaConsumoId','especieId'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.detCalaPescaConsumo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detCalaPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetCalaPescaConsumo no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['calaFaenaConsumoId','especieId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.detCalaPescaConsumo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detCalaPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetCalaPescaConsumo no encontrado');
    await prisma.detCalaPescaConsumo.delete({ where: { id } });
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
