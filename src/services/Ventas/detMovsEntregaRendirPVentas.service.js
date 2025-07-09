import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetMovsEntregaRendirPVentas
 * Valida existencia de claves foráneas.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [entrega, responsable, tipoMov, centroCosto] = await Promise.all([
    prisma.entregaARendirPVentas.findUnique({ where: { id: data.entregaARendirPVentasId } }),
    prisma.usuario ? prisma.usuario.findUnique({ where: { id: data.responsableId } }) : Promise.resolve(true),
    prisma.tipoMovEntregaRendir.findUnique({ where: { id: data.tipoMovimientoId } }),
    prisma.centroCosto ? prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }) : Promise.resolve(true)
  ]);
  if (!entrega) throw new ValidationError('El entregaARendirPVentasId no existe.');
  if (prisma.usuario && !responsable) throw new ValidationError('El responsableId no existe.');
  if (!tipoMov) throw new ValidationError('El tipoMovimientoId no existe.');
  if (prisma.centroCosto && !centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.detMovsEntregaRendirPVentas.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detMovsEntregaRendirPVentas.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('DetMovsEntregaRendirPVentas no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.entregaARendirPVentasId || !data.responsableId || !data.fechaMovimiento || !data.tipoMovimientoId || !data.centroCostoId || data.monto === undefined) {
      throw new ValidationError('Todos los campos obligatorios deben estar presentes.');
    }
    await validarClavesForaneas(data);
    return await prisma.detMovsEntregaRendirPVentas.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detMovsEntregaRendirPVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetMovsEntregaRendirPVentas no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['entregaARendirPVentasId','responsableId','tipoMovimientoId','centroCostoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.detMovsEntregaRendirPVentas.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detMovsEntregaRendirPVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetMovsEntregaRendirPVentas no encontrado');
    await prisma.detMovsEntregaRendirPVentas.delete({ where: { id } });
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
