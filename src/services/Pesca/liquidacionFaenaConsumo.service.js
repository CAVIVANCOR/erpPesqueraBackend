import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para LiquidacionFaenaConsumo
 * Valida existencia de claves foráneas y previene borrado si tiene movimientos asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [faena, responsable, verificador] = await Promise.all([
    prisma.faenaPescaConsumo.findUnique({ where: { id: data.faena_pesca_consumo_id } }),
    prisma.personal.findUnique({ where: { id: data.responsable_id } }),
    data.verificadorId ? prisma.personal.findUnique({ where: { id: data.verificadorId } }) : Promise.resolve(true)
  ]);
  if (!faena) throw new ValidationError('El faena_pesca_consumo_id no existe.');
  if (!responsable) throw new ValidationError('El responsable_id no existe.');
  if (data.verificadorId && !verificador) throw new ValidationError('El verificadorId no existe.');
}

async function tieneMovimientos(id) {
  const liquidacion = await prisma.liquidacionFaenaConsumo.findUnique({
    where: { id },
    include: { movimientosLiqFaenaConsumo: true }
  });
  if (!liquidacion) throw new NotFoundError('LiquidacionFaenaConsumo no encontrada');
  return liquidacion.movimientosLiqFaenaConsumo && liquidacion.movimientosLiqFaenaConsumo.length > 0;
}

const listar = async () => {
  try {
    return await prisma.liquidacionFaenaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const liquidacion = await prisma.liquidacionFaenaConsumo.findUnique({ where: { id } });
    if (!liquidacion) throw new NotFoundError('LiquidacionFaenaConsumo no encontrada');
    return liquidacion;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['faena_pesca_consumo_id','fecha_liquidacion','responsable_id','saldo_inicial','saldo_final'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.liquidacionFaenaConsumo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.liquidacionFaenaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('LiquidacionFaenaConsumo no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['faena_pesca_consumo_id','responsable_id','verificadorId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.liquidacionFaenaConsumo.update({ where: { id }, data });
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
    await prisma.liquidacionFaenaConsumo.delete({ where: { id } });
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
