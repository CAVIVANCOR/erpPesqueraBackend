import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para LiquidacionTemporadaPesca
 * Valida existencia de claves foráneas, unicidad de temporadaPescaId y previene borrado si tiene movimientos asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [temporada, empresa, responsable, verificador] = await Promise.all([
    prisma.temporadaPesca.findUnique({ where: { id: data.temporadaPescaId } }),
    prisma.empresa.findUnique({ where: { id: data.empresaId } }),
    prisma.personal.findUnique({ where: { id: data.responsableId } }),
    data.verificadorId ? prisma.personal.findUnique({ where: { id: data.verificadorId } }) : true
  ]);
  if (!temporada) throw new ValidationError('El temporadaPescaId no existe.');
  if (!empresa) throw new ValidationError('El empresaId no existe.');
  if (!responsable) throw new ValidationError('El responsableId no existe.');
  if (data.verificadorId && !verificador) throw new ValidationError('El verificadorId no existe.');
}

async function validarUnicidadTemporadaPescaId(temporadaPescaId, id = null) {
  const where = id ? { temporadaPescaId, NOT: { id } } : { temporadaPescaId };
  const existe = await prisma.liquidacionTemporadaPesca.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe una liquidación para esa temporadaPescaId.');
}

async function tieneDependencias(id) {
  const liq = await prisma.liquidacionTemporadaPesca.findUnique({
    where: { id },
    include: { movimientos: true }
  });
  if (!liq) throw new NotFoundError('LiquidacionTemporadaPesca no encontrada');
  return (liq.movimientos && liq.movimientos.length > 0);
}

const listar = async () => {
  try {
    return await prisma.liquidacionTemporadaPesca.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const liq = await prisma.liquidacionTemporadaPesca.findUnique({ where: { id } });
    if (!liq) throw new NotFoundError('LiquidacionTemporadaPesca no encontrada');
    return liq;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['temporadaPescaId','empresaId','fechaLiquidacion','responsableId','saldoFinal'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    await validarUnicidadTemporadaPescaId(data.temporadaPescaId);
    return await prisma.liquidacionTemporadaPesca.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.liquidacionTemporadaPesca.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('LiquidacionTemporadaPesca no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['temporadaPescaId','empresaId','responsableId','verificadorId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
      if (data.temporadaPescaId && data.temporadaPescaId !== existente.temporadaPescaId) {
        await validarUnicidadTemporadaPescaId(data.temporadaPescaId, id);
      }
    }
    return await prisma.liquidacionTemporadaPesca.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    if (await tieneDependencias(id)) {
      throw new ConflictError('No se puede eliminar porque tiene movimientos asociados.');
    }
    await prisma.liquidacionTemporadaPesca.delete({ where: { id } });
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
