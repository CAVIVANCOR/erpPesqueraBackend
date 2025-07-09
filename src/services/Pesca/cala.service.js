import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Cala
 * Valida existencia de claves foráneas y previene borrado si tiene especies asociadas.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [bahia, motorista, patron, embarcacion, faenaPesca, temporadaPesca] = await Promise.all([
    prisma.bahia.findUnique({ where: { id: data.bahiaId } }),
    prisma.tripulante.findUnique({ where: { id: data.motoristaId } }),
    prisma.tripulante.findUnique({ where: { id: data.patronId } }),
    prisma.embarcacion.findUnique({ where: { id: data.embarcacionId } }),
    prisma.faenaPesca.findUnique({ where: { id: data.faenaPescaId } }),
    prisma.temporadaPesca.findUnique({ where: { id: data.temporadaPescaId } })
  ]);
  if (!bahia) throw new ValidationError('El bahiaId no existe.');
  if (!motorista) throw new ValidationError('El motoristaId no existe.');
  if (!patron) throw new ValidationError('El patronId no existe.');
  if (!embarcacion) throw new ValidationError('El embarcacionId no existe.');
  if (!faenaPesca) throw new ValidationError('El faenaPescaId no existe.');
  if (!temporadaPesca) throw new ValidationError('El temporadaPescaId no existe.');
}

const listar = async () => {
  try {
    return await prisma.cala.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const cala = await prisma.cala.findUnique({ where: { id } });
    if (!cala) throw new NotFoundError('Cala no encontrada');
    return cala;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['bahiaId','motoristaId','patronId','embarcacionId','faenaPescaId','temporadaPescaId','fechaHoraInicio','fechaHoraFin'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.cala.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.cala.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Cala no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['bahiaId','motoristaId','patronId','embarcacionId','faenaPescaId','temporadaPescaId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.cala.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.cala.findUnique({
      where: { id },
      include: { especiesPescadas: true }
    });
    if (!existente) throw new NotFoundError('Cala no encontrada');
    if (existente.especiesPescadas && existente.especiesPescadas.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene especies pescadas asociadas.');
    }
    await prisma.cala.delete({ where: { id } });
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
