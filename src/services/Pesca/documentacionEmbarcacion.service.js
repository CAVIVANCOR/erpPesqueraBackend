import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DocumentacionEmbarcacion
 * Documentado en español.
 */

const listar = async () => {
  try {
    return await prisma.documentacionEmbarcacion.findMany({
      include: {
        embarcacion: {
          include: {
            tipoEmbarcacion: true
          }
        }
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const doc = await prisma.documentacionEmbarcacion.findUnique({ 
      where: { id },
      include: {
        embarcacion: {
          include: {
            tipoEmbarcacion: true
          }
        }
      }
    });
    if (!doc) throw new NotFoundError('DocumentacionEmbarcacion no encontrada');
    return doc;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    return await prisma.documentacionEmbarcacion.create({ data });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.documentacionEmbarcacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DocumentacionEmbarcacion no encontrada');
    
    // Agregar updatedAt automáticamente
    const dataConFecha = {
      ...data,
      updatedAt: new Date()
    };
    
    return await prisma.documentacionEmbarcacion.update({ where: { id }, data: dataConFecha });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.documentacionEmbarcacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DocumentacionEmbarcacion no encontrada');
    await prisma.documentacionEmbarcacion.delete({ where: { id } });
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
