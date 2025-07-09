import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetallePreFactura
 * Valida existencia de claves foráneas.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [preFactura, producto, centroCosto] = await Promise.all([
    prisma.preFactura.findUnique({ where: { id: data.preFacturaId } }),
    prisma.producto.findUnique({ where: { id: data.productoId } }),
    prisma.centroCosto ? (data.centroCostoId ? prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }) : Promise.resolve(true)) : Promise.resolve(true)
  ]);
  if (!preFactura) throw new ValidationError('El preFacturaId no existe.');
  if (!producto) throw new ValidationError('El productoId no existe.');
  if (data.centroCostoId && prisma.centroCosto && !centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.detallePreFactura.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detallePreFactura.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('DetallePreFactura no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.preFacturaId || !data.productoId || data.cantidad === undefined) {
      throw new ValidationError('preFacturaId, productoId y cantidad son obligatorios.');
    }
    await validarClavesForaneas(data);
    return await prisma.detallePreFactura.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detallePreFactura.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetallePreFactura no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['preFacturaId','productoId','centroCostoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.detallePreFactura.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detallePreFactura.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetallePreFactura no encontrado');
    await prisma.detallePreFactura.delete({ where: { id } });
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
