import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para detDocsReqCotizaVentas
 * Valida existencia de claves foráneas.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [cotizacion, docReq] = await Promise.all([
    prisma.cotizacionVentas.findUnique({ where: { id: data.cotizacionVentasId } }),
    prisma.docRequeridaComprasVentas.findUnique({ where: { id: data.docRequeridaVentasId } })
  ]);
  if (!cotizacion) throw new ValidationError('El cotizacionVentasId no existe.');
  if (!docReq) throw new ValidationError('El docRequeridaVentasId no existe.');
}

const listar = async () => {
  try {
    return await prisma.detDocsReqCotizaVentas.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detDocsReqCotizaVentas.findUnique({ where: { id } });
    if (!det) throw new NotFoundError('detDocsReqCotizaVentas no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.cotizacionVentasId || !data.docRequeridaVentasId) {
      throw new ValidationError('cotizacionVentasId y docRequeridaVentasId son obligatorios.');
    }
    await validarClavesForaneas(data);
    return await prisma.detDocsReqCotizaVentas.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detDocsReqCotizaVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('detDocsReqCotizaVentas no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['cotizacionVentasId','docRequeridaVentasId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.detDocsReqCotizaVentas.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detDocsReqCotizaVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('detDocsReqCotizaVentas no encontrado');
    await prisma.detDocsReqCotizaVentas.delete({ where: { id } });
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
