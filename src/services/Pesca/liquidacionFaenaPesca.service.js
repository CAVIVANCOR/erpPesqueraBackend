import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para LiquidacionFaenaPesca
 * Valida existencia de claves foráneas, unicidad de faena_pesca_id y previene borrado si tiene movimientos asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [faenaPesca, temporada, responsable, verificador] = await Promise.all([
    prisma.faenaPesca.findUnique({ where: { id: data.faena_pesca_id } }),
    prisma.temporadaPesca.findUnique({ where: { id: data.temporada_pesca_id } }),
    prisma.personal.findUnique({ where: { id: data.responsable_id } }),
    data.verificadorId ? prisma.personal.findUnique({ where: { id: data.verificadorId } }) : true
  ]);
  if (!faenaPesca) throw new ValidationError('El faena_pesca_id no existe.');
  if (!temporada) throw new ValidationError('El temporada_pesca_id no existe.');
  if (!responsable) throw new ValidationError('El responsable_id no existe.');
  if (data.verificadorId && !verificador) throw new ValidationError('El verificadorId no existe.');
}

async function validarUnicidadFaenaPescaId(faena_pesca_id, id = null) {
  const where = id ? { faena_pesca_id, NOT: { id } } : { faena_pesca_id };
  const existe = await prisma.liquidacionFaenaPesca.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe una liquidación para esa faena_pesca_id.');
}

async function tieneDependencias(id) {
  const liq = await prisma.liquidacionFaenaPesca.findUnique({
    where: { id },
    include: { movimientosLiqFaenaPesca: true }
  });
  if (!liq) throw new NotFoundError('LiquidacionFaenaPesca no encontrada');
  return (liq.movimientosLiqFaenaPesca && liq.movimientosLiqFaenaPesca.length > 0);
}

const listar = async () => {
  try {
    return await prisma.liquidacionFaenaPesca.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const liq = await prisma.liquidacionFaenaPesca.findUnique({ where: { id } });
    if (!liq) throw new NotFoundError('LiquidacionFaenaPesca no encontrada');
    return liq;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['faena_pesca_id','temporada_pesca_id','fecha_liquidacion','responsable_id','saldo_inicial','saldo_final'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    await validarUnicidadFaenaPescaId(data.faena_pesca_id);
    return await prisma.liquidacionFaenaPesca.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.liquidacionFaenaPesca.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('LiquidacionFaenaPesca no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['faena_pesca_id','temporada_pesca_id','responsable_id','verificadorId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
      if (data.faena_pesca_id && data.faena_pesca_id !== existente.faena_pesca_id) {
        await validarUnicidadFaenaPescaId(data.faena_pesca_id, id);
      }
    }
    return await prisma.liquidacionFaenaPesca.update({ where: { id }, data });
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
    await prisma.liquidacionFaenaPesca.delete({ where: { id } });
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
