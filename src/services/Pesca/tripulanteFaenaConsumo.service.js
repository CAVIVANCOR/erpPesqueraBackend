import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TripulanteFaenaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [faena, personal, cargo] = await Promise.all([
    prisma.faenaPescaConsumo.findUnique({ where: { id: data.faenaPescaConsumoId } }),
    data.personalId ? prisma.personal.findUnique({ where: { id: data.personalId } }) : true,
    data.cargoId ? prisma.cargo.findUnique({ where: { id: data.cargoId } }) : true
  ]);
  if (!faena) throw new ValidationError('El faenaPescaConsumoId no existe.');
  if (data.personalId && !personal) throw new ValidationError('El personalId no existe.');
  if (data.cargoId && !cargo) throw new ValidationError('El cargoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.tripulanteFaenaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const tripulante = await prisma.tripulanteFaenaConsumo.findUnique({ where: { id } });
    if (!tripulante) throw new NotFoundError('TripulanteFaenaConsumo no encontrado');
    return tripulante;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (typeof data.faenaPescaConsumoId === 'undefined' || data.faenaPescaConsumoId === null) {
      throw new ValidationError('El campo faenaPescaConsumoId es obligatorio.');
    }
    await validarClavesForaneas(data);
    return await prisma.tripulanteFaenaConsumo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tripulanteFaenaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TripulanteFaenaConsumo no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['faenaPescaConsumoId','personalId','cargoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.tripulanteFaenaConsumo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.tripulanteFaenaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TripulanteFaenaConsumo no encontrado');
    await prisma.tripulanteFaenaConsumo.delete({ where: { id } });
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
