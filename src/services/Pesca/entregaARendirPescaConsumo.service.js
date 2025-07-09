import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para EntregaARendirPescaConsumo
 * Valida existencia de claves foráneas y previene borrado si tiene movimientos asociados.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [novedad, responsable, centroCosto] = await Promise.all([
    prisma.novedadPescaConsumo.findUnique({ where: { id: data.novedadPescaConsumoId } }),
    prisma.personal.findUnique({ where: { id: data.respEntregaRendirId } }),
    prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } })
  ]);
  if (!novedad) throw new ValidationError('El novedadPescaConsumoId no existe.');
  if (!responsable) throw new ValidationError('El respEntregaRendirId no existe.');
  if (!centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

async function tieneMovimientos(id) {
  const entrega = await prisma.entregaARendirPescaConsumo.findUnique({
    where: { id },
    include: { movimientos: true }
  });
  if (!entrega) throw new NotFoundError('EntregaARendirPescaConsumo no encontrada');
  return entrega.movimientos && entrega.movimientos.length > 0;
}

const listar = async () => {
  try {
    return await prisma.entregaARendirPescaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const entrega = await prisma.entregaARendirPescaConsumo.findUnique({ where: { id } });
    if (!entrega) throw new NotFoundError('EntregaARendirPescaConsumo no encontrada');
    return entrega;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['novedadPescaConsumoId','respEntregaRendirId','centroCostoId'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.entregaARendirPescaConsumo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.entregaARendirPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('EntregaARendirPescaConsumo no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['novedadPescaConsumoId','respEntregaRendirId','centroCostoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.entregaARendirPescaConsumo.update({ where: { id }, data });
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
    await prisma.entregaARendirPescaConsumo.delete({ where: { id } });
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
