import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetallePreFactura
 * Valida existencia de claves foráneas.
 * Soporta conversión automática entre unidades comerciales y de almacén.
 * Documentado en español.
 */

/**
 * Calcula cantidad y precio en unidad de almacén desde datos comerciales
 * @param {Object} producto - Producto con unidadMedida y unidadMedidaComercial incluidas
 * @param {Number} cantidadVenta - Cantidad en unidad comercial
 * @param {Number} precioUnitarioVenta - Precio en unidad comercial
 * @returns {Object} { cantidad, precioUnitario }
 */
function calcularDatosAlmacen(producto, cantidadVenta, precioUnitarioVenta) {
  // Si no hay unidad comercial, retornar los mismos valores
  if (!producto.unidadMedidaComercial || !producto.unidadMedidaComercialId) {
    return {
      cantidad: cantidadVenta,
      precioUnitario: precioUnitarioVenta
    };
  }

  const factorComercial = Number(producto.unidadMedidaComercial.factorConversion) || 1;
  const factorAlmacen = Number(producto.unidadMedida.factorConversion) || 1;

  // Convertir cantidad: (cantidadVenta × factorComercial) ÷ factorAlmacen
  // Ejemplo: (1.5 TM × 1000 kg/TM) ÷ 20 kg/saco = 75 sacos
  const cantidad = (Number(cantidadVenta) * factorComercial) / factorAlmacen;

  // Convertir precio: precioUnitarioVenta × (factorAlmacen ÷ factorComercial)
  // Ejemplo: $2,500/TM × (20 kg/saco ÷ 1000 kg/TM) = $50/saco
  const precioUnitario = Number(precioUnitarioVenta) * (factorAlmacen / factorComercial);

  return {
    cantidad: Number(cantidad.toFixed(3)),
    precioUnitario: Number(precioUnitario.toFixed(6))
  };
}

async function validarClavesForaneas(data) {
  const [preFactura, producto] = await Promise.all([
    prisma.preFactura.findUnique({ where: { id: data.preFacturaId } }),
    prisma.producto.findUnique({ where: { id: data.productoId } })
  ]);
  if (!preFactura) throw new ValidationError('El preFacturaId no existe.');
  if (!producto) throw new ValidationError('El productoId no existe.');
}

const listar = async () => {
  try {
    return await prisma.detallePreFactura.findMany({
      include: {
        preFactura: true,
        producto: {
          include: {
            familia: true,
            subfamilia: true,
            unidadMedida: true,
            unidadMedidaComercial: true
          }
        }
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
    const det = await prisma.detallePreFactura.findUnique({
      where: { id },
      include: {
        preFactura: true,
        producto: {
          include: {
            familia: true,
            subfamilia: true,
            unidadMedida: true,
            unidadMedidaComercial: true
          }
        }
      }
    });
    if (!det) throw new NotFoundError('DetallePreFactura no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorPreFactura = async (preFacturaId) => {
  try {
    return await prisma.detallePreFactura.findMany({
      where: { preFacturaId },
      include: {
        producto: {
          include: {
            familia: true,
            subfamilia: true,
            unidadMedida: true,
            unidadMedidaComercial: true
          }
        }
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
    if (!data.preFacturaId || !data.productoId) {
      throw new ValidationError('preFacturaId y productoId son obligatorios.');
    }

    // Validar que se proporcione cantidad en alguna de las dos formas
    const tieneCantidadVenta = data.cantidadVenta !== undefined && data.cantidadVenta !== null;
    const tieneCantidad = data.cantidad !== undefined && data.cantidad !== null;

    if (!tieneCantidadVenta && !tieneCantidad) {
      throw new ValidationError('Debe proporcionar cantidad o cantidadVenta.');
    }

    await validarClavesForaneas(data);

    // Obtener producto con unidades de medida para cálculos
    const producto = await prisma.producto.findUnique({
      where: { id: data.productoId },
      include: {
        unidadMedida: true,
        unidadMedidaComercial: true
      }
    });

    if (!producto) {
      throw new ValidationError('Producto no encontrado.');
    }

    let datosFinales = { ...data };

    // Si se proporcionaron datos comerciales, calcular datos de almacén
    if (tieneCantidadVenta && data.precioUnitarioVenta !== undefined && data.precioUnitarioVenta !== null) {
      const datosAlmacen = calcularDatosAlmacen(
        producto,
        data.cantidadVenta,
        data.precioUnitarioVenta
      );
      datosFinales.cantidad = datosAlmacen.cantidad;
      datosFinales.precioUnitario = datosAlmacen.precioUnitario;
    }
    // Si solo se proporcionaron datos de almacén, usarlos directamente
    else if (tieneCantidad) {
      if (data.precioUnitario === undefined || data.precioUnitario === null) {
        throw new ValidationError('Si proporciona cantidad, debe proporcionar precioUnitario.');
      }
      datosFinales.cantidad = Number(data.cantidad);
      datosFinales.precioUnitario = Number(data.precioUnitario);
    }

    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...datosFinales,
      fechaCreacion: datosFinales.fechaCreacion || new Date(),
      fechaActualizacion: datosFinales.fechaActualizacion || new Date(),
    };

    return await prisma.detallePreFactura.create({
      data: datosConAuditoria,
      include: {
        preFactura: true,
        producto: {
          include: {
            familia: true,
            subfamilia: true,
            unidadMedida: true,
            unidadMedidaComercial: true
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
    const existente = await prisma.detallePreFactura.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetallePreFactura no encontrado');
    
    // Validar claves foráneas si cambian
    const claves = ['preFacturaId', 'productoId', 'centroCostoId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }

    // Obtener producto con unidades de medida para cálculos
    const productoId = data.productoId || existente.productoId;
    const producto = await prisma.producto.findUnique({
      where: { id: productoId },
      include: {
        unidadMedida: true,
        unidadMedidaComercial: true
      }
    });

    if (!producto) {
      throw new ValidationError('Producto no encontrado.');
    }

    let datosFinales = { ...data };

    // Si se proporcionaron datos comerciales, calcular datos de almacén
    const tieneCantidadVenta = data.cantidadVenta !== undefined && data.cantidadVenta !== null;
    if (tieneCantidadVenta && data.precioUnitarioVenta !== undefined && data.precioUnitarioVenta !== null) {
      const datosAlmacen = calcularDatosAlmacen(
        producto,
        data.cantidadVenta,
        data.precioUnitarioVenta
      );
      datosFinales.cantidad = datosAlmacen.cantidad;
      datosFinales.precioUnitario = datosAlmacen.precioUnitario;
    }

    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...datosFinales,
      fechaCreacion: data.fechaCreacion || existente.fechaCreacion || new Date(),
      creadoPor: data.creadoPor || existente.creadoPor || null,
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };

    return await prisma.detallePreFactura.update({
      where: { id },
      data: datosConAuditoria,
      include: {
        preFactura: true,
        producto: {
          include: {
            familia: true,
            subfamilia: true,
            unidadMedida: true,
            unidadMedidaComercial: true
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
  obtenerPorPreFactura,
  crear,
  actualizar,
  eliminar
};