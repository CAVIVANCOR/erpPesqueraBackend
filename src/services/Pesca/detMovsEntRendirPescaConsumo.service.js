import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetMovsEntRendirPescaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [entrega, responsable, tipoMovimiento, centroCosto] = await Promise.all([
    prisma.entregaARendirPescaConsumo.findUnique({ where: { id: data.entregaARendirPescaConsumoId } }),
    prisma.personal.findUnique({ where: { id: data.responsableId } }),
    prisma.tipoMovEntregaRendir.findUnique({ where: { id: data.tipoMovimientoId } }),
    prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } })
  ]);
  if (!entrega) throw new ValidationError('El entregaARendirPescaConsumoId no existe.');
  if (!responsable) throw new ValidationError('El responsableId no existe.');
  if (!tipoMovimiento) throw new ValidationError('El tipoMovimientoId no existe.');
  if (!centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.detMovsEntRendirPescaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detMovsEntRendirPescaConsumo.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('DetMovsEntRendirPescaConsumo no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['entregaARendirPescaConsumoId','responsableId','fechaMovimiento','tipoMovimientoId','centroCostoId','monto'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.detMovsEntRendirPescaConsumo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detMovsEntRendirPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetMovsEntRendirPescaConsumo no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['entregaARendirPescaConsumoId','responsableId','tipoMovimientoId','centroCostoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.detMovsEntRendirPescaConsumo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detMovsEntRendirPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetMovsEntRendirPescaConsumo no encontrado');
    await prisma.detMovsEntRendirPescaConsumo.delete({ where: { id } });
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
