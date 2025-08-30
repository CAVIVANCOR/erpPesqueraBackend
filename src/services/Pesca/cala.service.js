import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

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
    const faenaPesca = await prisma.faenaPesca.findUnique({ 
      where: { id: data.faenaPescaId }
    });
    
    if (!faenaPesca) throw new ValidationError('FaenaPesca no encontrada');

    const calaData = {
      bahiaId: faenaPesca.bahiaId,
      motoristaId: faenaPesca.motoristaId,
      patronId: faenaPesca.patronId,
      embarcacionId: faenaPesca.embarcacionId,
      faenaPescaId: faenaPesca.id,
      temporadaPescaId: faenaPesca.temporadaId,
      fechaHoraInicio: data.fechaHoraInicio || null,
      fechaHoraFin: data.fechaHoraFin || null,
      latitud: data.latitud || null,
      longitud: data.longitud || null,
      profundidadM: data.profundidadM || null,
      toneladasCapturadas: data.toneladasCapturadas || null,
      observaciones: data.observaciones || null,
    };

    return await prisma.cala.create({ data: calaData });
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
    return await prisma.cala.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
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
    if (existente.especiesPescadas?.length > 0) {
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
