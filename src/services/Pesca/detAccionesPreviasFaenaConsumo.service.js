import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetAccionesPreviasFaenaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [faena, accionPrevia, responsable, verificador] = await Promise.all([
    prisma.faenaPescaConsumo.findUnique({ where: { id: data.faenaPescaConsumoId } }),
    prisma.accionesPreviasFaena.findUnique({ where: { id: data.accionPreviaId } }),
    data.responsableId ? prisma.personal.findUnique({ where: { id: data.responsableId } }) : true,
    data.verificadorId ? prisma.personal.findUnique({ where: { id: data.verificadorId } }) : true
  ]);
  if (!faena) throw new ValidationError('El faenaPescaConsumoId no existe.');
  if (!accionPrevia) throw new ValidationError('El accionPreviaId no existe.');
  if (data.responsableId && !responsable) throw new ValidationError('El responsableId no existe.');
  if (data.verificadorId && !verificador) throw new ValidationError('El verificadorId no existe.');
}

const listar = async () => {
  try {
    return await prisma.detAccionesPreviasFaenaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detAccionesPreviasFaenaConsumo.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('DetAccionesPreviasFaenaConsumo no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['faenaPescaConsumoId','accionPreviaId'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.detAccionesPreviasFaenaConsumo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detAccionesPreviasFaenaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetAccionesPreviasFaenaConsumo no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['faenaPescaConsumoId','accionPreviaId','responsableId','verificadorId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.detAccionesPreviasFaenaConsumo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detAccionesPreviasFaenaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetAccionesPreviasFaenaConsumo no encontrado');
    await prisma.detAccionesPreviasFaenaConsumo.delete({ where: { id } });
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
