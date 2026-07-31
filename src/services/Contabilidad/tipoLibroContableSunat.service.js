import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

async function validarTipoLibroContableSunat(data) {
  if (data.codigoSunat && data.codigoSunat.trim().length === 0) {
    throw new ValidationError('El codigo SUNAT no puede estar vacio.');
  }

  if (data.codigoSunat && data.codigoSunat.length > 2) {
    throw new ValidationError('El codigo SUNAT no puede exceder 2 caracteres.');
  }

  if (data.descripcion && data.descripcion.trim().length === 0) {
    throw new ValidationError('La descripcion no puede estar vacia.');
  }

  if (data.descripcion && data.descripcion.length > 250) {
    throw new ValidationError('La descripcion no puede exceder 250 caracteres.');
  }
}

const listar = async () => {
  try {
    return await prisma.tipoLibroContableSunat.findMany({
      orderBy: { codigoSunat: 'asc' }
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
    const tipo = await prisma.tipoLibroContableSunat.findUnique({
      where: { id }
    });
    if (!tipo) throw new NotFoundError('Tipo de libro contable SUNAT no encontrado');
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
    if (!data.codigoSunat) {
      throw new ValidationError('El codigo SUNAT es obligatorio.');
    }

    if (!data.descripcion) {
      throw new ValidationError('La descripcion es obligatoria.');
    }

    await validarTipoLibroContableSunat(data);

    const tipoData = {
      codigoSunat: data.codigoSunat.trim(),
      descripcion: data.descripcion.trim(),
      activo: data.activo !== undefined ? data.activo : true
    };
    return await prisma.tipoLibroContableSunat.create({ data: tipoData });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      if (err.code === 'P2002') {
        throw new ConflictError('Ya existe un tipo de libro contable SUNAT con ese codigo.');
      }
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoLibroContableSunat.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de libro contable SUNAT no encontrado');

    await validarTipoLibroContableSunat(data);

    return await prisma.tipoLibroContableSunat.update({
      where: { id },
      data: data
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      if (err.code === 'P2002') {
        throw new ConflictError('Ya existe un tipo de libro contable SUNAT con ese codigo.');
      }
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoLibroContableSunat.findUnique({
      where: { id },
      include: {
        asientosContables: true
      }
    });

    if (!existente) throw new NotFoundError('Tipo de libro contable SUNAT no encontrado');

    const totalRelaciones = existente.asientosContables?.length || 0;

    if (totalRelaciones > 0) {
      throw new ConflictError('No se puede eliminar el tipo porque tiene asientos contables asociados.');
    }

    await prisma.tipoLibroContableSunat.delete({ where: { id } });
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
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};