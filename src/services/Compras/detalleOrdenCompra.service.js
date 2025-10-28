import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetalleOrdenCompra
 * Documentado en español.
 */

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
            marca: true,
            familia: true,
            subfamilia: true
          }
        }
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
    await validarForaneas(data);
    
    // Calcular subtotal si no viene
    if (!data.subtotal && data.cantidad && data.precioUnitario) {
      data.subtotal = data.cantidad * data.precioUnitario;
    }
    
    const nuevo = await prisma.detalleOrdenCompra.create({
      data: {
        ...data,
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      },
      include: {
        producto: {
          include: {
            unidadMedida: true,
            marca: true
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
    
    // Recalcular subtotal si cambian cantidad o precio
    if (data.cantidad || data.precioUnitario) {
      const cantidad = data.cantidad ?? existe.cantidad;
      const precio = data.precioUnitario ?? existe.precioUnitario;
      data.subtotal = cantidad * precio;
    }
    
    const actualizado = await prisma.detalleOrdenCompra.update({
      where: { id },
      data: {
        ...data,
        fechaActualizacion: new Date()
      },
      include: {
        producto: {
          include: {
            unidadMedida: true,
            marca: true
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