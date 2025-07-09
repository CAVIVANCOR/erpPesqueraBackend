import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para MovLiqNovedadPescaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [liqNovedad, tipoMov, centroCosto] = await Promise.all([
    prisma.liqNovedadPescaConsumo.findUnique({ where: { id: data.liqNovedadPescaConsumoId } }),
    prisma.tipoMovEntregaRendir.findUnique({ where: { id: data.tipoMovimientoId } }),
    data.centroCostoId ? prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }) : Promise.resolve(true)
  ]);
  if (!liqNovedad) throw new ValidationError('El liqNovedadPescaConsumoId no existe.');
  if (!tipoMov) throw new ValidationError('El tipoMovimientoId no existe.');
  if (data.centroCostoId && !centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.movLiqNovedadPescaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const mov = await prisma.movLiqNovedadPescaConsumo.findUnique({ where: { id } });
    if (!mov) throw new NotFoundError('MovLiqNovedadPescaConsumo no encontrado');
    return mov;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['liqNovedadPescaConsumoId','tipoMovimientoId','monto','fechaMovimiento'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.movLiqNovedadPescaConsumo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.movLiqNovedadPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MovLiqNovedadPescaConsumo no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['liqNovedadPescaConsumoId','tipoMovimientoId','centroCostoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.movLiqNovedadPescaConsumo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.movLiqNovedadPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MovLiqNovedadPescaConsumo no encontrado');
    await prisma.movLiqNovedadPescaConsumo.delete({ where: { id } });
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
