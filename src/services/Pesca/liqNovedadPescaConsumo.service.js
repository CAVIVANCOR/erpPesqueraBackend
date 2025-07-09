import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para LiqNovedadPescaConsumo
 * Valida existencia de claves foráneas y previene borrado si tiene movimientos asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [novedad, empresa, responsable, verificador] = await Promise.all([
    prisma.novedadPescaConsumo.findUnique({ where: { id: data.novedadPescaConsumoId } }),
    prisma.empresa.findUnique({ where: { id: data.empresaId } }),
    prisma.personal.findUnique({ where: { id: data.responsableId } }),
    data.verificadorId ? prisma.personal.findUnique({ where: { id: data.verificadorId } }) : Promise.resolve(true)
  ]);
  if (!novedad) throw new ValidationError('El novedadPescaConsumoId no existe.');
  if (!empresa) throw new ValidationError('El empresaId no existe.');
  if (!responsable) throw new ValidationError('El responsableId no existe.');
  if (data.verificadorId && !verificador) throw new ValidationError('El verificadorId no existe.');
}

async function tieneMovimientos(id) {
  const liq = await prisma.liqNovedadPescaConsumo.findUnique({
    where: { id },
    include: { movimientos: true }
  });
  if (!liq) throw new NotFoundError('LiqNovedadPescaConsumo no encontrada');
  return liq.movimientos && liq.movimientos.length > 0;
}

const listar = async () => {
  try {
    return await prisma.liqNovedadPescaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const liq = await prisma.liqNovedadPescaConsumo.findUnique({ where: { id } });
    if (!liq) throw new NotFoundError('LiqNovedadPescaConsumo no encontrada');
    return liq;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['novedadPescaConsumoId','empresaId','fechaLiquidacion','responsableId','saldoFinal'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.liqNovedadPescaConsumo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.liqNovedadPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('LiqNovedadPescaConsumo no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['novedadPescaConsumoId','empresaId','responsableId','verificadorId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.liqNovedadPescaConsumo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    if (await tieneMovimientos(id)) {
      throw new ConflictError('No se puede eliminar porque tiene movimientos asociados.');
    }
    await prisma.liqNovedadPescaConsumo.delete({ where: { id } });
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
