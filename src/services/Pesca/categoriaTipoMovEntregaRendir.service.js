import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CategoriaTipoMovEntregaRendir
 * Valida unicidad de nombre y previene borrado si tiene tipos de movimiento asociados.
 * Documentado en español.
 */

async function validarUnicidadNombre(nombre, id = null) {
  const where = id ? { nombre, NOT: { id } } : { nombre };
  const existe = await prisma.categoriaTipoMovEntregaRendir.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe una categoría con ese nombre.');
}

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
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
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
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.nombre) throw new ValidationError('El campo nombre es obligatorio.');
    await validarUnicidadNombre(data.nombre);
    return await prisma.categoriaTipoMovEntregaRendir.create({ 
      data,
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
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.categoriaTipoMovEntregaRendir.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('CategoriaTipoMovEntregaRendir no encontrada');
    if (data.nombre && data.nombre !== existente.nombre) {
      await validarUnicidadNombre(data.nombre, id);
    }
    return await prisma.categoriaTipoMovEntregaRendir.update({ 
      where: { id }, 
      data,
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
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
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