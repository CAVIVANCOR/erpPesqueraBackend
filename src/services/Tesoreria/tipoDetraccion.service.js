import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoDetraccion
 * Catálogo de tipos de detracción según SUNAT
 */

async function validarTipoDetraccion(data) {
  if (!data.codigo || !data.nombre) {
    throw new ValidationError('Código y nombre son obligatorios');
  }

  if (data.tasa !== undefined && (data.tasa < 0 || data.tasa > 100)) {
    throw new ValidationError('La tasa debe estar entre 0 y 100');
  }

  const existente = await prisma.tipoDetraccion.findFirst({
    where: {
      codigo: data.codigo,
      id: data.id ? { not: data.id } : undefined
    }
  });

  if (existente) {
    throw new ConflictError(`Ya existe un tipo con el código ${data.codigo}`);
  }
}

const listar = async () => {
  try {
    return await prisma.tipoDetraccion.findMany({
      orderBy: { codigo: 'asc' }
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
    const tipo = await prisma.tipoDetraccion.findUnique({
      where: { id }
    });
    if (!tipo) throw new NotFoundError('Tipo de detracción no encontrado');
    return tipo;
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
    await validarTipoDetraccion(data);

    return await prisma.tipoDetraccion.create({
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        tasa: data.tasa || 0,
        activo: data.activo !== undefined ? data.activo : true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoDetraccion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de detracción no encontrado');

    await validarTipoDetraccion({ ...data, id });

    return await prisma.tipoDetraccion.update({
      where: { id },
      data: {
        codigo: data.codigo,
        nombre: data.nombre,
        tasa: data.tasa,
        activo: data.activo
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoDetraccion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de detracción no encontrado');

    const enUso = await prisma.detraccion.count({ where: { tipoDetraccionId: id } });

    if (enUso > 0) {
      throw new ConflictError('No se puede eliminar el tipo porque está en uso');
    }

    await prisma.tipoDetraccion.delete({ where: { id } });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const listarActivos = async () => {
  try {
    return await prisma.tipoDetraccion.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  listarActivos
};