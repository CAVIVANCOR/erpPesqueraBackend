import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para BolicheRed
 * Valida unicidad y existencia de activoId, y previene borrado si tiene faenas asociadas.
 * Documentado en español.
 */

async function validarActivoId(activoId, id = null) {
  // Validar existencia de activo
  const activo = await prisma.activo.findUnique({ where: { id: activoId } });
  if (!activo) throw new ValidationError('El activoId no existe.');
  // Validar unicidad de activoId
  const where = id ? { activoId, NOT: { id } } : { activoId };
  const existe = await prisma.bolicheRed.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un BolicheRed con ese activoId.');
}

const listar = async () => {
  try {
    return await prisma.bolicheRed.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const boliche = await prisma.bolicheRed.findUnique({ where: { id } });
    if (!boliche) throw new NotFoundError('BolicheRed no encontrado');
    return boliche;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.activoId) {
      throw new ValidationError('El campo activoId es obligatorio.');
    }
    await validarActivoId(data.activoId);
    return await prisma.bolicheRed.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.bolicheRed.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('BolicheRed no encontrado');
    if (data.activoId && data.activoId !== existente.activoId) {
      await validarActivoId(data.activoId, id);
    }
    return await prisma.bolicheRed.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.bolicheRed.findUnique({
      where: { id },
      include: { faenas: true, faenasConsumo: true }
    });
    if (!existente) throw new NotFoundError('BolicheRed no encontrado');
    if ((existente.faenas && existente.faenas.length > 0) || (existente.faenasConsumo && existente.faenasConsumo.length > 0)) {
      throw new ConflictError('No se puede eliminar porque tiene faenas o faenas de consumo asociadas.');
    }
    await prisma.bolicheRed.delete({ where: { id } });
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
