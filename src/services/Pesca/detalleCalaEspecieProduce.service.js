import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleCalaEspecieProduce
 * Valida existencia de claves foráneas y (opcional) unicidad por calaProduceId-especieId.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [calaProduce, especie] = await Promise.all([
    prisma.calaProduce.findUnique({ where: { id: data.calaProduceId } }),
    prisma.especie.findUnique({ where: { id: data.especieId } })
  ]);
  if (!calaProduce) throw new ValidationError('El calaProduceId no existe.');
  if (!especie) throw new ValidationError('El especieId no existe.');
}

async function validarUnicidad(calaProduceId, especieId, id = null) {
  const where = id ? { calaProduceId, especieId, NOT: { id } } : { calaProduceId, especieId };
  const existe = await prisma.detalleCalaEspecieProduce.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un registro para esa cala produce y especie.');
}

const listar = async () => {
  try {
    return await prisma.detalleCalaEspecieProduce.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detalleCalaEspecieProduce.findUnique({ where: { id } });
    if (!detalle) throw new NotFoundError('DetalleCalaEspecieProduce no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.calaProduceId || !data.especieId) {
      throw new ValidationError('Los campos calaProduceId y especieId son obligatorios.');
    }
    await validarClavesForaneas(data);
    await validarUnicidad(data.calaProduceId, data.especieId);
    return await prisma.detalleCalaEspecieProduce.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detalleCalaEspecieProduce.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleCalaEspecieProduce no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['calaProduceId','especieId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
      await validarUnicidad(
        data.calaProduceId || existente.calaProduceId,
        data.especieId || existente.especieId,
        id
      );
    }
    return await prisma.detalleCalaEspecieProduce.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detalleCalaEspecieProduce.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleCalaEspecieProduce no encontrado');
    await prisma.detalleCalaEspecieProduce.delete({ where: { id } });
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
