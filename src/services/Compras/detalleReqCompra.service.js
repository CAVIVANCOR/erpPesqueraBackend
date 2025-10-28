import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleReqCompra
 * Documentado en español.
 */

async function validarForaneas(data) {
  if (data.requerimientoCompraId) {
    const req = await prisma.requerimientoCompra.findUnique({ 
      where: { id: data.requerimientoCompraId } 
    });
    if (!req) throw new ValidationError('El requerimiento de compra referenciado no existe.');
  }
  
  if (data.productoId) {
    const producto = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!producto) throw new ValidationError('El producto referenciado no existe.');
  }
  
  if (data.proveedorId) {
    const proveedor = await prisma.entidadComercial.findUnique({ where: { id: data.proveedorId } });
    if (!proveedor) throw new ValidationError('El proveedor referenciado no existe.');
  }
}

const listar = async (requerimientoCompraId) => {
  try {
    const where = {};
    if (requerimientoCompraId) {
      where.requerimientoCompraId = BigInt(requerimientoCompraId);
    }
    
    return await prisma.detalleReqCompra.findMany({ 
      where,
      include: { 
        requerimientoCompra: true,
        producto: {
          include: {
            unidadMedida: true,
            marca: true,
            familia: true,
            subfamilia: true
          }
        },
        proveedor: true,
        detallesCotizacion: true
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
    const detalle = await prisma.detalleReqCompra.findUnique({ 
      where: { id },
      include: { 
        requerimientoCompra: true,
        producto: {
          include: {
            unidadMedida: true,
            marca: true
          }
        },
        proveedor: true,
        detallesCotizacion: true
      }
    });
    
    if (!detalle) throw new NotFoundError('DetalleReqCompra no encontrado');
    return detalle;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    await validarForaneas(data);
    
    // Calcular subtotal si no viene
    if (!data.subtotal && data.cantidad && data.costoUnitario) {
      data.subtotal = data.cantidad * data.costoUnitario;
    }
    
    // Heredar campos del RequerimientoCompra padre si no vienen especificados
    if (data.requerimientoCompraId) {
      const requerimiento = await prisma.requerimientoCompra.findUnique({
        where: { id: BigInt(data.requerimientoCompraId) },
        select: { proveedorId: true, monedaId: true }
      });
      
      if (requerimiento) {
        // Solo heredar si no vienen en data
        if (!data.proveedorId && requerimiento.proveedorId) {
          data.proveedorId = requerimiento.proveedorId;
        }
        if (!data.monedaId && requerimiento.monedaId) {
          data.monedaId = requerimiento.monedaId;
        }
      }
    }
    
    const nuevo = await prisma.detalleReqCompra.create({
      data: {
        ...data
      },
      include: {
        producto: {
          include: {
            unidadMedida: true,
            marca: true
          }
        },
        proveedor: true
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
    const existe = await prisma.detalleReqCompra.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('DetalleReqCompra no encontrado');
    
    await validarForaneas(data);
    
    // Recalcular subtotal si cambian cantidad o precio
    if (data.cantidad || data.costoUnitario) {
      const cantidad = data.cantidad ?? existe.cantidad;
      const precio = data.costoUnitario ?? existe.costoUnitario;
      data.subtotal = cantidad * precio;
    }
    
    // Heredar campos del RequerimientoCompra padre si no vienen especificados
    const requerimientoId = data.requerimientoCompraId || existe.requerimientoCompraId;
    if (requerimientoId) {
      const requerimiento = await prisma.requerimientoCompra.findUnique({
        where: { id: BigInt(requerimientoId) },
        select: { proveedorId: true, monedaId: true }
      });
      
      if (requerimiento) {
        // Solo heredar si no vienen en data y no existen en el registro actual
        if (!data.proveedorId && !existe.proveedorId && requerimiento.proveedorId) {
          data.proveedorId = requerimiento.proveedorId;
        }
        if (!data.monedaId && !existe.monedaId && requerimiento.monedaId) {
          data.monedaId = requerimiento.monedaId;
        }
      }
    }
    
    const actualizado = await prisma.detalleReqCompra.update({
      where: { id },
      data: {
        ...data
      },
      include: {
        producto: {
          include: {
            unidadMedida: true,
            marca: true
          }
        },
        proveedor: true
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
    const existe = await prisma.detalleReqCompra.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('DetalleReqCompra no encontrado');
    
    await prisma.detalleReqCompra.delete({ where: { id } });
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