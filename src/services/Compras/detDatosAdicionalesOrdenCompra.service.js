import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetDatosAdicionalesOrdenCompra
 * Documentado en español.
 */

async function validarForaneas(data) {
  if (data.ordenCompraId) {
    const orden = await prisma.ordenCompra.findUnique({ 
      where: { id: data.ordenCompraId } 
    });
    if (!orden) throw new ValidationError('La orden de compra referenciada no existe.');
  }
}

const listar = async (ordenCompraId) => {
  try {
    const where = {};
    if (ordenCompraId) {
      where.ordenCompraId = BigInt(ordenCompraId);
    }
    
    return await prisma.detDatosAdicionalesOrdenCompra.findMany({ 
      where,
      include: { 
        ordenCompra: true
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
    const dato = await prisma.detDatosAdicionalesOrdenCompra.findUnique({ 
      where: { id },
      include: { 
        ordenCompra: true
      }
    });
    
    if (!dato) throw new NotFoundError('DetDatosAdicionalesOrdenCompra no encontrado');
    return dato;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    await validarForaneas(data);
    
    const nuevo = await prisma.detDatosAdicionalesOrdenCompra.create({
      data: {
        ...data,
        creadoEn: new Date(),
        actualizadoEn: new Date()
      },
      include: {
        ordenCompra: true
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
    const existe = await prisma.detDatosAdicionalesOrdenCompra.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('DetDatosAdicionalesOrdenCompra no encontrado');
    
    await validarForaneas(data);
    
    const actualizado = await prisma.detDatosAdicionalesOrdenCompra.update({
      where: { id },
      data: {
        ...data,
        actualizadoEn: new Date()
      },
      include: {
        ordenCompra: true
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
    const existe = await prisma.detDatosAdicionalesOrdenCompra.findUnique({ where: { id } });
    if (!existe) throw new NotFoundError('DetDatosAdicionalesOrdenCompra no encontrado');
    
    await prisma.detDatosAdicionalesOrdenCompra.delete({ where: { id } });
    return { eliminado: true, id };
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
