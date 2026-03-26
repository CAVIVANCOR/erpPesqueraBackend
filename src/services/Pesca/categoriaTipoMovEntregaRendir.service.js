import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CategoriaTipoMovEntregaRendir
 * Previene borrado si tiene tipos de movimiento asociados.
 * Documentado en español.
 */


async function tieneDependencias(id) {
  const categoria = await prisma.categoriaTipoMovEntregaRendir.findUnique({
    where: { id },
    include: {
      tiposMovimiento: true
    }
  });
  if (!categoria) throw new NotFoundError('CategoriaTipoMovEntregaRendir no encontrada');
  return (categoria.tiposMovimiento && categoria.tiposMovimiento.length > 0);
}

const listar = async () => {
  try {
    return await prisma.categoriaTipoMovEntregaRendir.findMany({
      include: {
        creador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        },
        actualizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError(`Error al listar categorías: ${err.message}`);
    }
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const categoria = await prisma.categoriaTipoMovEntregaRendir.findUnique({ 
      where: { id },
      include: {
        creador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        },
        actualizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      }
    });
    if (!categoria) throw new NotFoundError('CategoriaTipoMovEntregaRendir no encontrada');
    return categoria;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError(`Error al obtener categoría: ${err.message}`);
    }
    throw err;
  }
};

const crear = async (data, userId) => {
  try {
    if (!data.nombre || data.nombre.trim() === '') {
      throw new ValidationError('El campo nombre es obligatorio.');
    }

    const datosLimpios = {
      nombre: data.nombre.trim(),
      cesado: data.cesado !== undefined ? Boolean(data.cesado) : false,
      tipo: data.tipo !== undefined ? Boolean(data.tipo) : false,
      creadoPor: userId ? BigInt(userId) : null,
    };

    return await prisma.categoriaTipoMovEntregaRendir.create({
      data: datosLimpios,
      include: {
        creador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      }
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      if (err.code === 'P2002') {
        throw new ConflictError('Ya existe una categoría con ese nombre.');
      }
      throw new DatabaseError(`Error al crear categoría: ${err.message}`);
    }
    throw err;
  }
};

const actualizar = async (id, data, userId) => {
  try {
    const existente = await prisma.categoriaTipoMovEntregaRendir.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('CategoriaTipoMovEntregaRendir no encontrada');

    const datosLimpios = {};
    
    if (data.nombre !== undefined) {
      if (!data.nombre || data.nombre.trim() === '') {
        throw new ValidationError('El campo nombre no puede estar vacío.');
      }
      datosLimpios.nombre = data.nombre.trim();
    }
    
    if (data.cesado !== undefined) {
      datosLimpios.cesado = Boolean(data.cesado);
    }
    
    if (data.tipo !== undefined) {
      datosLimpios.tipo = Boolean(data.tipo);
    }
    
    if (userId) {
      datosLimpios.actualizadoPor = BigInt(userId);
    }

    return await prisma.categoriaTipoMovEntregaRendir.update({
      where: { id }, 
      data: datosLimpios,
      include: {
        actualizador: {
          select: {
            id: true,
            nombres: true,
            apellidos: true
          }
        }
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      if (err.code === 'P2002') {
        throw new ConflictError('Ya existe una categoría con ese nombre.');
      }
      throw new DatabaseError(`Error al actualizar categoría: ${err.message}`);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    if (await tieneDependencias(id)) {
      throw new ConflictError('No se puede eliminar porque tiene tipos de movimiento asociados.');
    }
    await prisma.categoriaTipoMovEntregaRendir.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError(`Error al eliminar categoría: ${err.message}`);
    }
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