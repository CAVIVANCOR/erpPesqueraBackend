import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleDescargaFaena
 * Valida existencia de claves foráneas.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [descargaFaena, especie] = await Promise.all([
    prisma.descargaFaenaPesca.findUnique({ where: { id: data.descargaFaenaId } }),
    prisma.especie.findUnique({ where: { id: data.especieId } })
  ]);
  if (!descargaFaena) throw new ValidationError('El descargaFaenaId no existe.');
  if (!especie) throw new ValidationError('El especieId no existe.');
}

const listar = async () => {
  try {
    return await prisma.detalleDescargaFaena.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detalleDescargaFaena.findUnique({ where: { id } });
    if (!detalle) throw new NotFoundError('DetalleDescargaFaena no encontrado');
    return detalle;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['descargaFaenaId','especieId'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.detalleDescargaFaena.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detalleDescargaFaena.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleDescargaFaena no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['descargaFaenaId','especieId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.detalleDescargaFaena.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detalleDescargaFaena.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetalleDescargaFaena no encontrado');
    await prisma.detalleDescargaFaena.delete({ where: { id } });
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
