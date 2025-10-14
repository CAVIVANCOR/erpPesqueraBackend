import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetMovsEntRendirPescaConsumo
 * Valida existencia de claves foráneas y campos obligatorios.
 * Documentado en español.
 */

// Función helper para convertir BigInt a String y Date a ISO String
function convertirBigIntAString(obj) {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  // ✅ AGREGAR: Convertir Date a ISO string
  if (obj instanceof Date) {
    return obj.toISOString();
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
  const validaciones = [
    prisma.entregaARendirPescaConsumo.findUnique({ where: { id: data.entregaARendirPescaConsumoId } }),
    prisma.personal.findUnique({ where: { id: data.responsableId } }),
    prisma.tipoMovEntregaRendir.findUnique({ where: { id: data.tipoMovimientoId } }),
    prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } })
  ];

  // Agregar validación de Moneda si se proporciona monedaId
  if (data.monedaId) {
    validaciones.push(
      prisma.moneda.findUnique({ where: { id: data.monedaId } })
    );
  }

  // Agregar validación de EntidadComercial si se proporciona entidadComercialId
  if (data.entidadComercialId) {
    validaciones.push(
      prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } })
    );
  }

  // Agregar validación de ModuloSistema si se proporciona moduloOrigenMovCajaId
  if (data.moduloOrigenMovCajaId) {
    validaciones.push(
      prisma.moduloSistema.findUnique({ where: { id: data.moduloOrigenMovCajaId } })
    );
  }

  const [entrega, responsable, tipoMovimiento, centroCosto, moneda, entidadComercial, moduloSistema] = await Promise.all(validaciones);
  
  if (!entrega) throw new ValidationError('El entregaARendirPescaConsumoId no existe.');
  if (!responsable) throw new ValidationError('El responsableId no existe.');
  if (!tipoMovimiento) throw new ValidationError('El tipoMovimientoId no existe.');
  if (!centroCosto) throw new ValidationError('El centroCostoId no existe.');
  if (data.monedaId && !moneda) throw new ValidationError('El monedaId no existe.');
  if (data.entidadComercialId && !entidadComercial) throw new ValidationError('El entidadComercialId no existe.');
  if (data.moduloOrigenMovCajaId && !moduloSistema) throw new ValidationError('El moduloOrigenMovCajaId no existe.');
}

const listar = async () => {
  try {
    const detMovs = await prisma.detMovsEntRendirPescaConsumo.findMany({
      include: {
        entregaARendirPescaConsumo: true,
        tipoMovimiento: true,
        entidadComercial: true,
        moneda: true,
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
        moneda: true,
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
        monedaId: data.monedaId 
          ? BigInt(data.monedaId) 
          : null,
        urlComprobanteOperacionMovCaja: data.urlComprobanteOperacionMovCaja || null,
        
        creadoEn: data.creadoEn ? new Date(data.creadoEn) : new Date(),
        actualizadoEn: data.actualizadoEn ? new Date(data.actualizadoEn) : new Date(),
      },
      include: {
        entregaARendirPescaConsumo: true,
        tipoMovimiento: true,
        entidadComercial: true,
        moneda: true,
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
        monedaId: data.monedaId !== undefined
          ? (data.monedaId ? BigInt(data.monedaId) : null)
          : undefined,
        urlComprobanteOperacionMovCaja: data.urlComprobanteOperacionMovCaja !== undefined
          ? data.urlComprobanteOperacionMovCaja
          : undefined,
        
        actualizadoEn: new Date(),
      },
      include: {
        entregaARendirPescaConsumo: true,
        tipoMovimiento: true,
        entidadComercial: true,
        moneda: true,
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