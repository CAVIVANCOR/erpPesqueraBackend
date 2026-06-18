import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CategoriaTipoDeudaTributaria
 * Gestiona el catálogo de categorías de tipos de deuda tributaria
 * Documentado en español.
 */

async function validarCategoriaTipoDeudaTributaria(data) {
  if (data.nombre && data.nombre.trim().length === 0) {
    throw new ValidationError('El nombre no puede estar vacío.');
  }

  if (data.nombre && data.nombre.length > 100) {
    throw new ValidationError('El nombre no puede exceder 100 caracteres.');
  }
}

const listar = async () => {
  try {
    return await prisma.categoriaTipoDeudaTributaria.findMany({
      orderBy: { nombre: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarActivos = async () => {
  try {
    return await prisma.categoriaTipoDeudaTributaria.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const categoria = await prisma.categoriaTipoDeudaTributaria.findUnique({
      where: { id },
      include: {
        tiposDeuda: {
          orderBy: { nombre: 'asc' },
          take: 20
        }
      }
    });
    if (!categoria) throw new NotFoundError('Categoría de tipo de deuda tributaria no encontrada');
    return categoria;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.nombre) {
      throw new ValidationError('El nombre es obligatorio.');
    }

    await validarCategoriaTipoDeudaTributaria(data);

    const categoriaData = {
      nombre: data.nombre,
      descripcion: data.descripcion || null,
      activo: data.activo !== undefined ? data.activo : true,
      creadoPor: data.creadoPor || null
    };

    return await prisma.categoriaTipoDeudaTributaria.create({ data: categoriaData });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.categoriaTipoDeudaTributaria.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Categoría de tipo de deuda tributaria no encontrada');

    await validarCategoriaTipoDeudaTributaria(data);

    const categoriaData = {
      ...data,
      actualizadoPor: data.actualizadoPor || null
    };

    return await prisma.categoriaTipoDeudaTributaria.update({
      where: { id },
      data: categoriaData
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.categoriaTipoDeudaTributaria.findUnique({
      where: { id },
      include: { tiposDeuda: true }
    });

    if (!existente) throw new NotFoundError('Categoría de tipo de deuda tributaria no encontrada');

    if (existente.tiposDeuda && existente.tiposDeuda.length > 0) {
      throw new ConflictError('No se puede eliminar la categoría porque tiene tipos de deuda asociados.');
    }

    await prisma.categoriaTipoDeudaTributaria.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

export default {
  listar,
  listarActivos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};