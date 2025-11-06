import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetDocsReqCotizaVentas
 * Gestiona documentos requeridos por cotización de ventas
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [cotizacion, docReq, moneda] = await Promise.all([
    prisma.cotizacionVentas.findUnique({ where: { id: data.cotizacionVentasId } }),
    prisma.docRequeridaVentas.findUnique({ where: { id: data.docRequeridaVentasId } }),
    data.monedaId ? prisma.moneda.findUnique({ where: { id: data.monedaId } }) : Promise.resolve(true)
  ]);
  
  if (!cotizacion) throw new ValidationError('El cotizacionVentasId no existe.');
  if (!docReq) throw new ValidationError('El docRequeridaVentasId no existe.');
  if (data.monedaId && !moneda) throw new ValidationError('El monedaId no existe.');
}

const listar = async () => {
  try {
    return await prisma.detDocsReqCotizaVentas.findMany({
      include: {
        cotizacionVentas: true,
        docRequeridaVentas: true,
        moneda: true
      },
      orderBy: { id: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detDocsReqCotizaVentas.findUnique({ 
      where: { id },
      include: {
        cotizacionVentas: true,
        docRequeridaVentas: true,
        moneda: true
      }
    });
    if (!det) throw new NotFoundError('DetDocsReqCotizaVentas no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorCotizacion = async (cotizacionVentasId) => {
  try {
    return await prisma.detDocsReqCotizaVentas.findMany({
      where: { cotizacionVentasId },
      include: {
        docRequeridaVentas: true,
        moneda: true
      },
      orderBy: { id: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.cotizacionVentasId || !data.docRequeridaVentasId) {
      throw new ValidationError('Los campos obligatorios no pueden estar vacíos: cotizacionVentasId, docRequeridaVentasId');
    }
    
    await validarClavesForaneas(data);
    
    const datosConAuditoria = {
      ...data,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };
    
    return await prisma.detDocsReqCotizaVentas.create({ 
      data: datosConAuditoria,
      include: {
        cotizacionVentas: true,
        docRequeridaVentas: true,
        moneda: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detDocsReqCotizaVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetDocsReqCotizaVentas no encontrado');
    
    const claves = ['cotizacionVentasId', 'docRequeridaVentasId', 'monedaId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    
    const datosConAuditoria = {
      ...data,
      fechaCreacion: existente.fechaCreacion,
      creadoPor: existente.creadoPor,
      fechaActualizacion: new Date()
    };
    
    return await prisma.detDocsReqCotizaVentas.update({ 
      where: { id }, 
      data: datosConAuditoria,
      include: {
        cotizacionVentas: true,
        docRequeridaVentas: true,
        moneda: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.detDocsReqCotizaVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetDocsReqCotizaVentas no encontrado');
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
  obtenerPorCotizacion,
  crear,
  actualizar,
  eliminar
};