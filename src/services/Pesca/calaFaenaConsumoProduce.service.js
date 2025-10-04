import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CalaFaenaConsumoProduce
 * Valida existencia de claves foráneas y previene borrado si tiene especies procesadas asociadas.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [bahia, motorista, patron, embarcacion, faena] = await Promise.all([
    prisma.personal.findUnique({ where: { id: data.bahiaId } }),
    prisma.personal.findUnique({ where: { id: data.motoristaId } }),
    prisma.personal.findUnique({ where: { id: data.patronId } }),
    prisma.embarcacion.findUnique({ where: { id: data.embarcacionId } }),
    prisma.faenaPescaConsumo.findUnique({ where: { id: data.faenaPescaConsumoId } })
  ]);
  if (!bahia) throw new ValidationError('El bahiaId no existe.');
  if (!motorista) throw new ValidationError('El motoristaId no existe.');
  if (!patron) throw new ValidationError('El patronId no existe.');
  if (!embarcacion) throw new ValidationError('El embarcacionId no existe.');
  if (!faena) throw new ValidationError('El faenaPescaConsumoId no existe.');
}

async function tieneEspeciesProcesadas(id) {
  const cala = await prisma.calaFaenaConsumoProduce.findUnique({
    where: { id },
    include: { especiesProcesadas: true }
  });
  if (!cala) throw new NotFoundError('CalaFaenaConsumoProduce no encontrada');
  return cala.especiesProcesadas && cala.especiesProcesadas.length > 0;
}

const listar = async () => {
  try {
    return await prisma.calaFaenaConsumoProduce.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const cala = await prisma.calaFaenaConsumoProduce.findUnique({ where: { id } });
    if (!cala) throw new NotFoundError('CalaFaenaConsumoProduce no encontrada');
    return cala;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['bahiaId','motoristaId','patronId','embarcacionId','faenaPescaConsumoId','fechaHoraInicio','fechaHoraFin'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.calaFaenaConsumoProduce.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.calaFaenaConsumoProduce.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('CalaFaenaConsumoProduce no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['bahiaId','motoristaId','patronId','embarcacionId','faenaPescaConsumoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.calaFaenaConsumoProduce.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    if (await tieneEspeciesProcesadas(id)) {
      throw new ConflictError('No se puede eliminar porque tiene especies procesadas asociadas.');
    }
    await prisma.calaFaenaConsumoProduce.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
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
