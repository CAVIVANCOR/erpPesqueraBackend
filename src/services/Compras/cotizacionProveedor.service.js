import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio para CotizacionProveedor (Cabecera-Detalle)
 * Maneja cotizaciones de proveedores con sus detalles
 */

async function validarForaneas(data) {
  if (data.requerimientoCompraId) {
    const req = await prisma.requerimientoCompra.findUnique({ 
      where: { id: data.requerimientoCompraId } 
    });
    if (!req) throw new ValidationError('El requerimiento de compra no existe.');
  }
  
  if (data.proveedorId) {
    const proveedor = await prisma.entidadComercial.findUnique({ 
      where: { id: data.proveedorId } 
    });
    if (!proveedor) throw new ValidationError('El proveedor no existe.');
  }

  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ 
      where: { id: data.monedaId } 
    });
    if (!moneda) throw new ValidationError('La moneda no existe.');
  }
}

/**
 * Lista cotizaciones por requerimiento
 */
const listar = async (requerimientoCompraId) => {
  try {
    const where = {};
    if (requerimientoCompraId) {
      where.requerimientoCompraId = BigInt(requerimientoCompraId);
    }
    
    return await prisma.cotizacionProveedor.findMany({ 
      where,
      include: { 
        proveedor: true,
        moneda: true,
        requerimientoCompra: true,
        detalles: {
          include: {
            producto: {
              include: {
                unidadMedida: true
              }
            },
            detalleReqCompra: true
          },
          orderBy: {
            creadoEn: 'asc'
          }
        }
      },
      orderBy: {
        fechaCotizacion: 'desc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una cotización por ID con todos sus detalles
 */
const obtenerPorId = async (id) => {
  try {
    const cotizacion = await prisma.cotizacionProveedor.findUnique({ 
      where: { id },
      include: { 
        proveedor: true,
        moneda: true,
        requerimientoCompra: {
          include: {
            detalles: {
              include: {
                producto: {
                  include: {
                    unidadMedida: true
                  }
                }
              }
            }
          }
        },
        detalles: {
          include: {
            producto: {
              include: {
                unidadMedida: true
              }
            },
            detalleReqCompra: true
          },
          orderBy: {
            creadoEn: 'asc'
          }
        }
      }
    });
    
    if (!cotizacion) throw new NotFoundError('Cotización no encontrada');
    return cotizacion;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una cotización con sus detalles automáticamente
 * Copia todos los items del requerimiento con precio 0
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios
    if (!data.requerimientoCompraId) throw new ValidationError('El requerimientoCompraId es obligatorio');
    if (!data.proveedorId) throw new ValidationError('El proveedorId es obligatorio');
    if (!data.monedaId) throw new ValidationError('El monedaId es obligatorio');
    
    await validarForaneas(data);
    
    // Obtener detalles del requerimiento
    const detallesReq = await prisma.detalleReqCompra.findMany({
      where: { requerimientoCompraId: BigInt(data.requerimientoCompraId) },
      include: {
        producto: true
      }
    });
    
    if (!detallesReq || detallesReq.length === 0) {
      throw new ValidationError('El requerimiento no tiene items para cotizar');
    }
    
    // Crear cotización con detalles en transacción
    return await prisma.$transaction(async (tx) => {
      // 1. Crear cabecera de cotización
      const cotizacion = await tx.cotizacionProveedor.create({
        data: {
          requerimientoCompraId: BigInt(data.requerimientoCompraId),
          proveedorId: BigInt(data.proveedorId),
          monedaId: BigInt(data.monedaId),
          fechaCotizacion: data.fechaCotizacion || new Date(),
          urlCotizacionPdf: data.urlCotizacionPdf || null,
          creadoPor: data.creadoPor || null
        }
      });
      
      // 2. Crear detalles copiando items del requerimiento
      const detallesCreados = await Promise.all(
        detallesReq.map(detReq => 
          tx.detalleCotizacionProveedor.create({
            data: {
              cotizacionProveedorId: cotizacion.id,
              detalleReqCompraId: detReq.id,
              productoId: detReq.productoId,
              cantidad: detReq.cantidad,
              precioUnitario: 0, // Usuario lo llenará después
              subtotal: 0,
              esProductoAlternativo: false
            }
          })
        )
      );
      
      // 3. Retornar cotización completa
      return await tx.cotizacionProveedor.findUnique({
        where: { id: cotizacion.id },
        include: {
          proveedor: true,
          moneda: true,
          requerimientoCompra: true,
          detalles: {
            include: {
              producto: {
                include: {
                  unidadMedida: true
                }
              },
              detalleReqCompra: true
            }
          }
        }
      });
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza la cabecera de una cotización
 */
const actualizar = async (id, data) => {
  try {
    const existe = await prisma.cotizacionProveedor.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Cotización no encontrada');
    
    await validarForaneas(data);
    
    const actualizado = await prisma.cotizacionProveedor.update({
      where: { id },
      data: {
        ...data,
        actualizadoEn: new Date()
      },
      include: {
        proveedor: true,
        moneda: true,
        requerimientoCompra: true,
        detalles: {
          include: {
            producto: {
              include: {
                unidadMedida: true
              }
            }
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

/**
 * Elimina una cotización y todos sus detalles (Cascade)
 */
const eliminar = async (id) => {
  try {
    const existe = await prisma.cotizacionProveedor.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('Cotización no encontrada');
    
    await prisma.cotizacionProveedor.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un detalle de cotización (precio, cantidad)
 */
const actualizarDetalle = async (detalleId, data) => {
  try {
    const existe = await prisma.detalleCotizacionProveedor.findUnique({ 
      where: { id: BigInt(detalleId) } 
    });
    if (!existe) throw new NotFoundError('Detalle de cotización no encontrado');
    
    // Calcular subtotal
    const cantidad = data.cantidad !== undefined ? data.cantidad : existe.cantidad;
    const precioUnitario = data.precioUnitario !== undefined ? data.precioUnitario : existe.precioUnitario;
    const subtotal = Number(cantidad) * Number(precioUnitario);
    
    const actualizado = await prisma.detalleCotizacionProveedor.update({
      where: { id: BigInt(detalleId) },
      data: {
        ...data,
        subtotal,
        actualizadoEn: new Date()
      },
      include: {
        producto: {
          include: {
            unidadMedida: true
          }
        }
      }
    });
    
    return actualizado;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Agrega un producto alternativo a una cotización
 */
const agregarProductoAlternativo = async (cotizacionId, data) => {
  try {
    if (!data.productoId) throw new ValidationError('El productoId es obligatorio');
    if (!data.cantidad) throw new ValidationError('La cantidad es obligatoria');
    
    const cotizacion = await prisma.cotizacionProveedor.findUnique({ 
      where: { id: BigInt(cotizacionId) } 
    });
    if (!cotizacion) throw new NotFoundError('Cotización no encontrada');
    
    const producto = await prisma.producto.findUnique({ 
      where: { id: BigInt(data.productoId) } 
    });
    if (!producto) throw new ValidationError('El producto no existe');
    
    // Calcular subtotal
    const subtotal = Number(data.cantidad) * Number(data.precioUnitario || 0);
    
    const detalle = await prisma.detalleCotizacionProveedor.create({
      data: {
        cotizacionProveedorId: BigInt(cotizacionId),
        detalleReqCompraId: null, // NULL porque es producto alternativo
        productoId: BigInt(data.productoId),
        cantidad: data.cantidad,
        precioUnitario: data.precioUnitario || 0,
        subtotal,
        esProductoAlternativo: true,
        observaciones: data.observaciones || 'Producto alternativo ofrecido por el proveedor'
      },
      include: {
        producto: {
          include: {
            unidadMedida: true
          }
        }
      }
    });
    
    return detalle;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un detalle de cotización
 */
const eliminarDetalle = async (detalleId) => {
  try {
    const existe = await prisma.detalleCotizacionProveedor.findUnique({ 
      where: { id: BigInt(detalleId) } 
    });
    if (!existe) throw new NotFoundError('Detalle de cotización no encontrado');
    
    // Solo permitir eliminar productos alternativos
    if (!existe.esProductoAlternativo) {
      throw new ValidationError('Solo se pueden eliminar productos alternativos. Los productos del requerimiento original no se pueden eliminar.');
    }
    
    await prisma.detalleCotizacionProveedor.delete({ 
      where: { id: BigInt(detalleId) } 
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Marca/desmarca un detalle como seleccionado para orden de compra
 */
const marcarSeleccionadoParaOC = async (detalleId, esSeleccionado) => {
  try {
    const existe = await prisma.detalleCotizacionProveedor.findUnique({ 
      where: { id: BigInt(detalleId) } 
    });
    if (!existe) throw new NotFoundError('Detalle de cotización no encontrado');
    
    const actualizado = await prisma.detalleCotizacionProveedor.update({
      where: { id: BigInt(detalleId) },
      data: {
        esSeleccionadoParaOrdenCompra: esSeleccionado,
        actualizadoEn: new Date()
      },
      include: {
        producto: {
          include: {
            unidadMedida: true
          }
        }
      }
    });
    
    return actualizado;
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
  eliminar,
  actualizarDetalle,
  agregarProductoAlternativo,
  eliminarDetalle,
  marcarSeleccionadoParaOC
};