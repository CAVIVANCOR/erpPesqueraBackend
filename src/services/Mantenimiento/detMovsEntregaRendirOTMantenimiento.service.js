import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetMovsEntregaRendirOTMantenimiento
 * Replicado fielmente del patrón de DetMovsEntregaRendirMovAlmacen
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [entrega, responsable, tipoMov, centroCosto] = await Promise.all([
    prisma.entregaARendirOTMantenimiento.findUnique({ where: { id: data.entregaARendirOTMantenimientoId } }),
    prisma.personal ? prisma.personal.findUnique({ where: { id: data.responsableId } }) : Promise.resolve(true),
    prisma.tipoMovEntregaRendir.findUnique({ where: { id: data.tipoMovimientoId } }),
    prisma.centroCosto ? prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }) : Promise.resolve(true)
  ]);
  if (!entrega) throw new ValidationError('El entregaARendirOTMantenimientoId no existe.');
  if (prisma.personal && !responsable) throw new ValidationError('El responsableId no existe.');
  if (!tipoMov) throw new ValidationError('El tipoMovimientoId no existe.');
  if (prisma.centroCosto && !centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.detMovsEntregaRendirOTMantenimiento.findMany({
      include: {
        entregaARendirOTMantenimiento: {
          include: {
            otMantenimiento: {
              include: {
                activo: true,
                empresa: true
              }
            }
          }
        },
        tipoMovimiento: true,
        responsable: true,
        producto: true,
        moneda: true,
        entidadComercial: true,
        tipoDocumento: true,
        centroCosto: true
      },
      orderBy: { fechaMovimiento: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detMovsEntregaRendirOTMantenimiento.findUnique({ 
      where: { id },
      include: {
        entregaARendirOTMantenimiento: {
          include: {
            otMantenimiento: {
              include: {
                activo: true,
                empresa: true
              }
            }
          }
        },
        tipoMovimiento: true,
        responsable: true,
        producto: true,
        moneda: true,
        entidadComercial: true,
        tipoDocumento: true,
        centroCosto: true
      }
    });
    if (!det) throw new NotFoundError('DetMovsEntregaRendirOTMantenimiento no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorEntrega = async (entregaARendirOTMantenimientoId) => {
  try {
    return await prisma.detMovsEntregaRendirOTMantenimiento.findMany({
      where: { entregaARendirOTMantenimientoId },
      include: {
        tipoMovimiento: true,
        responsable: true,
        producto: true,
        moneda: true,
        entidadComercial: true,
        tipoDocumento: true,
        centroCosto: true
      },
      orderBy: { fechaMovimiento: 'desc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.entregaARendirOTMantenimientoId || !data.responsableId || !data.fechaMovimiento || !data.tipoMovimientoId || !data.centroCostoId || data.monto === undefined || !data.monedaId) {
      throw new ValidationError('Todos los campos obligatorios deben estar presentes: entregaARendirOTMantenimientoId, responsableId, fechaMovimiento, tipoMovimientoId, centroCostoId, monto, monedaId.');
    }
    await validarClavesForaneas(data);
    
    // Asegurar campos de auditoría y opcionales
    const datosConAuditoria = {
      ...data,
      validadoTesoreria: data.validadoTesoreria || false,
      operacionSinFactura: data.operacionSinFactura || false,
      fechaValidacionTesoreria: data.fechaValidacionTesoreria || null,
      motivoSinFactura: data.motivoSinFactura || null,
      operacionMovCajaId: data.operacionMovCajaId || null,
      fechaOperacionMovCaja: data.fechaOperacionMovCaja || null,
      urlComprobanteOperacionMovCaja: data.urlComprobanteOperacionMovCaja || null,
      moduloOrigenMovCajaId: data.moduloOrigenMovCajaId || null,
      creadoEn: data.creadoEn || new Date(),
      actualizadoEn: data.actualizadoEn || new Date(),
    };
    
    return await prisma.detMovsEntregaRendirOTMantenimiento.create({ 
      data: datosConAuditoria,
      include: {
        entregaARendirOTMantenimiento: {
          include: {
            otMantenimiento: {
              include: {
                activo: true,
                empresa: true
              }
            }
          }
        },
        tipoMovimiento: true,
        responsable: true,
        producto: true,
        moneda: true,
        entidadComercial: true,
        tipoDocumento: true,
        centroCosto: true
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
    const existente = await prisma.detMovsEntregaRendirOTMantenimiento.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetMovsEntregaRendirOTMantenimiento no encontrado');
    // Validar claves foráneas si cambian
    const claves = ['entregaARendirOTMantenimientoId','responsableId','tipoMovimientoId','centroCostoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    
    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      creadoEn: data.creadoEn || existente.creadoEn || new Date(),
      actualizadoEn: data.actualizadoEn || new Date(),
    };
    
    return await prisma.detMovsEntregaRendirOTMantenimiento.update({ 
      where: { id }, 
      data: datosConAuditoria,
      include: {
        entregaARendirOTMantenimiento: {
          include: {
            otMantenimiento: {
              include: {
                activo: true,
                empresa: true
              }
            }
          }
        },
        tipoMovimiento: true,
        responsable: true,
        producto: true,
        moneda: true,
        entidadComercial: true,
        tipoDocumento: true,
        centroCosto: true
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
    const existente = await prisma.detMovsEntregaRendirOTMantenimiento.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetMovsEntregaRendirOTMantenimiento no encontrado');
    await prisma.detMovsEntregaRendirOTMantenimiento.delete({ where: { id } });
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
  obtenerPorEntrega,
  crear,
  actualizar,
  eliminar
};
