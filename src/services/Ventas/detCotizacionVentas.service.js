import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetCotizacionVentas
 * Gestiona detalles de productos en cotizaciones de ventas
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [cotizacion, producto, centroCosto, movSalida] = await Promise.all([
    prisma.cotizacionVentas.findUnique({ where: { id: data.cotizacionVentasId } }),
    prisma.producto.findUnique({ where: { id: data.productoId } }),
    prisma.centroCosto.findUnique({ where: { id: data.centroCostoId } }),
    data.movSalidaAlmacenId ? prisma.movimientoAlmacen.findUnique({ where: { id: data.movSalidaAlmacenId } }) : Promise.resolve(true)
  ]);
  
  if (!cotizacion) throw new ValidationError('El cotizacionVentasId no existe.');
  if (!producto) throw new ValidationError('El productoId no existe.');
  if (!centroCosto) throw new ValidationError('El centroCostoId no existe.');
  if (data.movSalidaAlmacenId && !movSalida) throw new ValidationError('El movSalidaAlmacenId no existe.');
}

/**
 * Valida que el margen de utilidad real no sea menor al mínimo permitido
 * Fórmula: margenReal = ((precioFinal - precioBase) / precioFinal) × 100
 */
function validarMargenUtilidad(margenMinimo, precioFinal, precioBase, nombreProducto) {
  if (!precioFinal || precioFinal <= 0) return null;
  
  const margenReal = ((precioFinal - precioBase) / precioFinal) * 100;
  
  if (margenMinimo && margenReal < margenMinimo) {
    console.warn(`⚠️ Advertencia: Margen real (${margenReal.toFixed(2)}%) es menor al mínimo permitido (${margenMinimo}%) para el producto: ${nombreProducto}`);
    // No lanzar error, solo advertencia
  }
  
  return margenReal;
}

const listar = async () => {
  try {
    return await prisma.detCotizacionVentas.findMany({
      include: {
        cotizacionVentas: true,
        producto: {
          include: {
            familia: true,
            unidadMedida: true
          }
        }
      },
      orderBy: { item: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detCotizacionVentas.findUnique({ 
      where: { id },
      include: {
        cotizacionVentas: true,
        producto: {
          include: {
            familia: true,
            unidadMedida: true
          }
        }
      }
    });
    if (!det) throw new NotFoundError('DetCotizacionVentas no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorCotizacion = async (cotizacionVentasId) => {
  try {
    return await prisma.detCotizacionVentas.findMany({
      where: { cotizacionVentasId },
      include: {
        producto: {
          include: {
            familia: true,
            unidadMedida: true
          }
        }
      },
      orderBy: { item: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    // Validar campos obligatorios (item se calcula automáticamente)
    if (!data.cotizacionVentasId || !data.productoId || !data.cantidad || !data.precioUnitario || !data.precioUnitarioFinal || !data.centroCostoId) {
      throw new ValidationError('Los campos obligatorios no pueden estar vacíos: cotizacionVentasId, productoId, cantidad, precioUnitario, precioUnitarioFinal, centroCostoId');
    }
    
    await validarClavesForaneas(data);
    
    // Calcular automáticamente el número de item si no viene
    if (!data.item) {
      const maxItem = await prisma.detCotizacionVentas.findFirst({
        where: { cotizacionVentasId: data.cotizacionVentasId },
        orderBy: { item: 'desc' },
        select: { item: true }
      });
      data.item = maxItem ? maxItem.item + 1 : 1;
    }
    
    const producto = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (producto && producto.margenMinimoPermitido) {
      const margenReal = validarMargenUtilidad(producto.margenMinimoPermitido, data.precioUnitarioFinal, data.precioUnitario, producto.nombre);
      if (margenReal !== null) {
        data.margenUtilidadReal = margenReal;
      }
    }
    
    const datosConAuditoria = {
      ...data,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date()
    };
    
    return await prisma.detCotizacionVentas.create({ 
      data: datosConAuditoria,
      include: {
        cotizacionVentas: true,
        producto: {
          include: {
            familia: true,
            unidadMedida: true
          }
        }
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
    const existente = await prisma.detCotizacionVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetCotizacionVentas no encontrado');
    
    const claves = ['cotizacionVentasId', 'productoId', 'centroCostoId', 'movSalidaAlmacenId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    
    const datosConAuditoria = {
      ...data,
      fechaCreacion: existente.fechaCreacion,
      creadoPor: existente.creadoPor,
      fechaActualizacion: new Date()
    };
    
    return await prisma.detCotizacionVentas.update({ 
      where: { id }, 
      data: datosConAuditoria,
      include: {
        cotizacionVentas: true,
        producto: {
          include: {
            familia: true,
            unidadMedida: true
          }
        }
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
    const existente = await prisma.detCotizacionVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetCotizacionVentas no encontrado');
    await prisma.detCotizacionVentas.delete({ where: { id } });
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