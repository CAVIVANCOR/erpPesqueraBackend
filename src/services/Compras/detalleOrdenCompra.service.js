import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleOrdenCompra
 * Soporta conversión automática entre unidades comerciales y de almacén.
 * Documentado en español.
 */

/**
 * Calcula cantidad y precio en unidad de almacén desde datos comerciales
 * @param {Object} producto - Producto con unidadMedida y unidadMedidaComercial incluidas
 * @param {Number} cantidadCompra - Cantidad en unidad comercial
 * @param {Number} precioUnitarioCompra - Precio en unidad comercial
 * @returns {Object} { cantidad, precioUnitario }
 */
function calcularDatosAlmacen(producto, cantidadCompra, precioUnitarioCompra) {
  // Si no hay unidad comercial, retornar los mismos valores
  if (!producto.unidadMedidaComercial || !producto.unidadMedidaComercialId) {
    return {
      cantidad: cantidadCompra,
      precioUnitario: precioUnitarioCompra
    };
  }

  const factorComercial = Number(producto.unidadMedidaComercial.factorConversion) || 1;
  const factorAlmacen = Number(producto.unidadMedida.factorConversion) || 1;

  // Convertir cantidad: (cantidadCompra × factorComercial) ÷ factorAlmacen
  // Ejemplo: (1.5 TM × 1000 kg/TM) ÷ 20 kg/saco = 75 sacos
  const cantidad = (Number(cantidadCompra) * factorComercial) / factorAlmacen;

  // Convertir precio: precioUnitarioCompra × (factorAlmacen ÷ factorComercial)
  // Ejemplo: $2,500/TM × (20 kg/saco ÷ 1000 kg/TM) = $50/saco
  const precioUnitario = Number(precioUnitarioCompra) * (factorAlmacen / factorComercial);

  return {
    cantidad: Number(cantidad.toFixed(3)),
    precioUnitario: Number(precioUnitario.toFixed(6))
  };
}

async function validarForaneas(data) {
  if (data.ordenCompraId) {
    const orden = await prisma.ordenCompra.findUnique({
      where: { id: data.ordenCompraId }
    });
    if (!orden) throw new ValidationError('La orden de compra referenciada no existe.');
  }

  if (data.productoId) {
    const producto = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!producto) throw new ValidationError('El producto referenciado no existe.');
  }
}

const listar = async (ordenCompraId) => {
  try {
    const where = {};
    if (ordenCompraId) {
      where.ordenCompraId = BigInt(ordenCompraId);
    }
    return await prisma.detalleOrdenCompra.findMany({
      where,
      include: {
        ordenCompra: true,
        producto: {
          include: {
            unidadMedida: true,
            unidadMedidaComercial: true,
            marca: true,
            familia: true,
            subfamilia: true
          }
        },
        tipoAfectacionIGV: true
      },
      orderBy: {
        id: 'asc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const detalle = await prisma.detalleOrdenCompra.findUnique({
      where: { id },
      include: {
        ordenCompra: true,
        producto: {
          include: {
            unidadMedida: true,
            unidadMedidaComercial: true,
            marca: true
          }
        }
      }
    });

    if (!detalle) throw new NotFoundError('DetalleOrdenCompra no encontrado');
    return detalle;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.ordenCompraId || !data.productoId) {
      throw new ValidationError('ordenCompraId y productoId son obligatorios.');
    }

    // Validar que se proporcione cantidad en alguna de las dos formas
    const tieneCantidadCompra = data.cantidadCompra !== undefined && data.cantidadCompra !== null;
    const tieneCantidad = data.cantidad !== undefined && data.cantidad !== null;

    if (!tieneCantidadCompra && !tieneCantidad) {
      throw new ValidationError('Debe proporcionar cantidad o cantidadCompra.');
    }

    await validarForaneas(data);

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
    if (tieneCantidadCompra && data.precioUnitarioCompra !== undefined && data.precioUnitarioCompra !== null) {
      const datosAlmacen = calcularDatosAlmacen(
        producto,
        data.cantidadCompra,
        data.precioUnitarioCompra
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

    // Calcular subtotal
    if (datosFinales.cantidad && datosFinales.precioUnitario) {
      datosFinales.subtotal = Number(datosFinales.cantidad) * Number(datosFinales.precioUnitario);
    }

    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...datosFinales,
      fechaCreacion: datosFinales.fechaCreacion || new Date(),
      fechaActualizacion: datosFinales.fechaActualizacion || new Date(),
    };

    const nuevo = await prisma.detalleOrdenCompra.create({
      data: datosConAuditoria,
      include: {
        producto: {
          include: {
            unidadMedida: true,
            unidadMedidaComercial: true,
            marca: true,
            familia: true,
            subfamilia: true
          }
        }
      }
    });

    return nuevo;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existe = await prisma.detalleOrdenCompra.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('DetalleOrdenCompra no encontrado');

    await validarForaneas(data);

    const productoId = data.productoId || existe.productoId;

    // Obtener producto con unidades de medida para cálculos
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
    const tieneCantidadCompra = data.cantidadCompra !== undefined && data.cantidadCompra !== null;
    if (tieneCantidadCompra && data.precioUnitarioCompra !== undefined && data.precioUnitarioCompra !== null) {
      const datosAlmacen = calcularDatosAlmacen(
        producto,
        data.cantidadCompra,
        data.precioUnitarioCompra
      );
      datosFinales.cantidad = datosAlmacen.cantidad;
      datosFinales.precioUnitario = datosAlmacen.precioUnitario;
    }

    // Recalcular subtotal si cambian cantidad o precio
    if (datosFinales.cantidad || datosFinales.precioUnitario) {
      const cantidad = datosFinales.cantidad ?? existe.cantidad;
      const precio = datosFinales.precioUnitario ?? existe.precioUnitario;
      datosFinales.subtotal = Number(cantidad) * Number(precio);
    }

    // Actualizar campo de auditoría
    datosFinales.fechaActualizacion = new Date();

    const actualizado = await prisma.detalleOrdenCompra.update({
      where: { id },
      data: datosFinales,
      include: {
        producto: {
          include: {
            unidadMedida: true,
            unidadMedidaComercial: true,
            marca: true,
            familia: true,
            subfamilia: true
          }
        }
      }
    });

    return actualizado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existe = await prisma.detalleOrdenCompra.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('DetalleOrdenCompra no encontrado');

    await prisma.detalleOrdenCompra.delete({ where: { id } });
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