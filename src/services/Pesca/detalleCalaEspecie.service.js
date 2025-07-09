import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleCalaEspecie
 * Valida existencia de claves foráneas y (opcional) unicidad por calaId-especieId.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [cala, especie] = await Promise.all([
    prisma.cala.findUnique({ where: { id: data.calaId } }),
    prisma.especie.findUnique({ where: { id: data.especieId } })
  ]);
  if (!cala) throw new ValidationError('El calaId no existe.');
  if (!especie) throw new ValidationError('El especieId no existe.');
}

async function validarUnicidad(calaId, especieId, id = null) {
  const where = id ? { calaId, especieId, NOT: { id } } : { calaId, especieId };
  const existe = await prisma.detalleCalaEspecie.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un registro para esa cala y especie.');
}

const listar = async () => {
  try {
    return await prisma.detalleCalaEspecie.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detalleCalaEspecie.findUnique({ where: { id } });
    if (!detalle) throw new NotFoundError('DetalleCalaEspecie no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.calaId || !data.especieId) {
      throw new ValidationError('Los campos calaId y especieId son obligatorios.');
    }
    await validarClavesForaneas(data);
    await validarUnicidad(data.calaId, data.especieId);
    return await prisma.detalleCalaEspecie.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detalleCalaEspecie.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleCalaEspecie no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['calaId','especieId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
      await validarUnicidad(
        data.calaId || existente.calaId,
        data.especieId || existente.especieId,
        id
      );
    }
    return await prisma.detalleCalaEspecie.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detalleCalaEspecie.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleCalaEspecie no encontrado');
    await prisma.detalleCalaEspecie.delete({ where: { id } });
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
