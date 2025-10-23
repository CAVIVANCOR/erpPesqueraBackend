import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CotizacionProveedor
 * Documentado en español.
 */

async function validarForaneas(data) {
  if (data.requerimientoCompraId) {
    const req = await prisma.requerimientoCompra.findUnique({ 
      where: { id: data.requerimientoCompraId } 
    });
    if (!req) throw new ValidationError('El requerimiento de compra referenciado no existe.');
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
    
    return await prisma.cotizacionProveedor.findMany({ 
      where,
      include: { 
        requerimientoCompra: true,
        proveedor: true,
        detallesReqCompra: {
          include: {
            producto: true
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

const obtenerPorId = async (id) => {
  try {
    const cotizacion = await prisma.cotizacionProveedor.findUnique({ 
      where: { id },
      include: { 
        requerimientoCompra: true,
        proveedor: true,
        detallesReqCompra: {
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
    
    if (!cotizacion) throw new NotFoundError('CotizacionProveedor no encontrada');
    return cotizacion;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    await validarForaneas(data);
    
    const nuevo = await prisma.cotizacionProveedor.create({
      data: {
        ...data,
        esSeleccionada: false,
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      },
      include: {
        proveedor: true,
        requerimientoCompra: true
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
    const existe = await prisma.cotizacionProveedor.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('CotizacionProveedor no encontrada');
    
    await validarForaneas(data);
    
    const actualizado = await prisma.cotizacionProveedor.update({
      where: { id },
      data: {
        ...data,
        fechaActualizacion: new Date()
      },
      include: {
        proveedor: true,
        requerimientoCompra: true
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
    const existe = await prisma.cotizacionProveedor.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('CotizacionProveedor no encontrada');
    
    // Validar que no esté seleccionada
    if (existe.esSeleccionada) {
      throw new ValidationError('No se puede eliminar una cotización seleccionada');
    }
    
    await prisma.cotizacionProveedor.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Selecciona una cotización como ganadora (desmarca las demás del mismo requerimiento)
 */
const seleccionar = async (id) => {
  try {
    const cotizacion = await prisma.cotizacionProveedor.findUnique({ 
      where: { id },
      include: {
        requerimientoCompra: true
      }
    });
    
    if (!cotizacion) throw new NotFoundError('CotizacionProveedor no encontrada');
    
    // Desmarcar todas las cotizaciones del mismo requerimiento
    await prisma.cotizacionProveedor.updateMany({
      where: {
        requerimientoCompraId: cotizacion.requerimientoCompraId
      },
      data: {
        esSeleccionada: false
      }
    });
    
    // Marcar esta como seleccionada
    const seleccionada = await prisma.cotizacionProveedor.update({
      where: { id },
      data: {
        esSeleccionada: true,
        fechaActualizacion: new Date()
      },
      include: {
        proveedor: true,
        requerimientoCompra: true
      }
    });
    
    // Actualizar el proveedor en el requerimiento
    await prisma.requerimientoCompra.update({
      where: { id: cotizacion.requerimientoCompraId },
      data: {
        proveedorId: cotizacion.proveedorId
      }
    });
    
    return seleccionada;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
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
  seleccionar
};