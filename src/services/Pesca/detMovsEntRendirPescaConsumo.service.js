import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetMovsEntRendirPescaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

// Función helper para convertir BigInt a String
function convertirBigIntAString(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertirBigIntAString);
  }
  
  if (typeof obj === 'object') {
    const nuevoObj = {};
    for (const key in obj) {
      nuevoObj[key] = convertirBigIntAString(obj[key]);
    }
    return nuevoObj;
  }
  
  return obj;
}

async function validarClavesForaneas(data) {
  const [entrega, responsable, tipoMovimiento, centroCosto] = await Promise.all([
    prisma.entregaARendirPescaConsumo.findUnique({ where: { id: data.entregaARendirPescaConsumoId } }),
    prisma.personal.findUnique({ where: { id: data.responsableId } }),
    prisma.tipoMovEntregaRendir.findUnique({ where: { id: data.tipoMovimientoId } }),
    prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } })
  ]);
  if (!entrega) throw new ValidationError('El entregaARendirPescaConsumoId no existe.');
  if (!responsable) throw new ValidationError('El responsableId no existe.');
  if (!tipoMovimiento) throw new ValidationError('El tipoMovimientoId no existe.');
  if (!centroCosto) throw new ValidationError('El centroCostoId no existe.');
}

const listar = async () => {
  try {
    const detMovs = await prisma.detMovsEntRendirPescaConsumo.findMany({
      include: {
        entregaARendirPescaConsumo: true,
        tipoMovimiento: true,
        entidadComercial: true,
      },
      orderBy: {
        fechaMovimiento: 'desc',
      },
    });
    
    return detMovs.map(convertirBigIntAString);
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detMovsEntRendirPescaConsumo.findUnique({ 
      where: { id: BigInt(id) },
      include: {
        entregaARendirPescaConsumo: true,
        tipoMovimiento: true,
        entidadComercial: true,
      },
    });
    
    if (!det) throw new NotFoundError('DetMovsEntRendirPescaConsumo no encontrado');
    
    return convertirBigIntAString(det);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

async function crear(data) {
  try {
    const nuevoDetMov = await prisma.detMovsEntRendirPescaConsumo.create({
      data: {
        entregaARendirPescaConsumoId: BigInt(data.entregaARendirPescaConsumoId),
        responsableId: BigInt(data.responsableId),
        fechaMovimiento: new Date(data.fechaMovimiento),
        tipoMovimientoId: BigInt(data.tipoMovimientoId),
        centroCostoId: BigInt(data.centroCostoId),
        monto: data.monto,
        descripcion: data.descripcion || null,
        
        // Campos nuevos agregados
        urlComprobanteMovimiento: data.urlComprobanteMovimiento || null,
        validadoTesoreria: data.validadoTesoreria || false,
        fechaValidacionTesoreria: data.fechaValidacionTesoreria 
          ? new Date(data.fechaValidacionTesoreria) 
          : null,
        operacionSinFactura: data.operacionSinFactura || false,
        fechaOperacionMovCaja: data.fechaOperacionMovCaja 
          ? new Date(data.fechaOperacionMovCaja) 
          : null,
        operacionMovCajaId: data.operacionMovCajaId 
          ? BigInt(data.operacionMovCajaId) 
          : null,
        moduloOrigenMovCajaId: data.moduloOrigenMovCajaId 
          ? BigInt(data.moduloOrigenMovCajaId) 
          : null,
        entidadComercialId: data.entidadComercialId 
          ? BigInt(data.entidadComercialId) 
          : null,
        
        creadoEn: data.creadoEn ? new Date(data.creadoEn) : new Date(),
        actualizadoEn: data.actualizadoEn ? new Date(data.actualizadoEn) : new Date(),
      },
      include: {
        entregaARendirPescaConsumo: true,
        tipoMovimiento: true,
        entidadComercial: true,
      },
    });

    return convertirBigIntAString(nuevoDetMov);
  } catch (error) {
    console.error("Error al crear DetMovsEntRendirPescaConsumo:", error);
    throw error;
  }
}

async function actualizar(id, data) {
  try {
    const detMovActualizado = await prisma.detMovsEntRendirPescaConsumo.update({
      where: { id: BigInt(id) },
      data: {
        responsableId: data.responsableId ? BigInt(data.responsableId) : undefined,
        fechaMovimiento: data.fechaMovimiento ? new Date(data.fechaMovimiento) : undefined,
        tipoMovimientoId: data.tipoMovimientoId ? BigInt(data.tipoMovimientoId) : undefined,
        centroCostoId: data.centroCostoId ? BigInt(data.centroCostoId) : undefined,
        monto: data.monto !== undefined ? data.monto : undefined,
        descripcion: data.descripcion !== undefined ? data.descripcion : undefined,
        
        // Campos nuevos agregados
        urlComprobanteMovimiento: data.urlComprobanteMovimiento !== undefined 
          ? data.urlComprobanteMovimiento 
          : undefined,
        validadoTesoreria: data.validadoTesoreria !== undefined 
          ? data.validadoTesoreria 
          : undefined,
        fechaValidacionTesoreria: data.fechaValidacionTesoreria !== undefined
          ? (data.fechaValidacionTesoreria ? new Date(data.fechaValidacionTesoreria) : null)
          : undefined,
        operacionSinFactura: data.operacionSinFactura !== undefined 
          ? data.operacionSinFactura 
          : undefined,
        fechaOperacionMovCaja: data.fechaOperacionMovCaja !== undefined
          ? (data.fechaOperacionMovCaja ? new Date(data.fechaOperacionMovCaja) : null)
          : undefined,
        operacionMovCajaId: data.operacionMovCajaId !== undefined
          ? (data.operacionMovCajaId ? BigInt(data.operacionMovCajaId) : null)
          : undefined,
        moduloOrigenMovCajaId: data.moduloOrigenMovCajaId !== undefined
          ? (data.moduloOrigenMovCajaId ? BigInt(data.moduloOrigenMovCajaId) : null)
          : undefined,
        entidadComercialId: data.entidadComercialId !== undefined
          ? (data.entidadComercialId ? BigInt(data.entidadComercialId) : null)
          : undefined,
        
        actualizadoEn: new Date(),
      },
      include: {
        entregaARendirPescaConsumo: true,
        tipoMovimiento: true,
        entidadComercial: true,
      },
    });

    return convertirBigIntAString(detMovActualizado);
  } catch (error) {
    console.error("Error al actualizar DetMovsEntRendirPescaConsumo:", error);
    throw error;
  }
}

const eliminar = async (id) => {
  try {
    const existente = await prisma.detMovsEntRendirPescaConsumo.findUnique({ where: { id: BigInt(id) } });
    if (!existente) throw new NotFoundError('DetMovsEntRendirPescaConsumo no encontrado');
    await prisma.detMovsEntRendirPescaConsumo.delete({ where: { id: BigInt(id) } });
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