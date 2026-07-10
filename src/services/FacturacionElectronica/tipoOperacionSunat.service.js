import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

async function validarTipoOperacionSunat(data) {
  if (data.codigo && data.codigo.trim().length === 0) {
    throw new ValidationError('El codigo no puede estar vacio.');
  }

  if (data.codigo && data.codigo.length > 4) {
    throw new ValidationError('El codigo no puede exceder 4 caracteres.');
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
    return await prisma.tipoOperacionSunat.findMany({
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
    const tipo = await prisma.tipoOperacionSunat.findUnique({
      where: { id }
    });
    if (!tipo) throw new NotFoundError('Tipo de operacion SUNAT no encontrado');
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
    if (!data.codigo) {
      throw new ValidationError('El codigo es obligatorio.');
    }

    if (!data.descripcion) {
      throw new ValidationError('La descripcion es obligatoria.');
    }

    await validarTipoOperacionSunat(data);

    const tipoData = {
      codigo: data.codigo.trim(),
      descripcion: data.descripcion.trim()
    };
    return await prisma.tipoOperacionSunat.create({ data: tipoData });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      if (err.code === 'P2002') {
        throw new ConflictError('Ya existe un tipo de operacion SUNAT con ese codigo.');
      }
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoOperacionSunat.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de operacion SUNAT no encontrado');

    await validarTipoOperacionSunat(data);

    return await prisma.tipoOperacionSunat.update({
      where: { id },
      data: data
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      if (err.code === 'P2002') {
        throw new ConflictError('Ya existe un tipo de operacion SUNAT con ese codigo.');
      }
      throw new DatabaseError('Error de base de datos', err.message);
    }
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoOperacionSunat.findUnique({
      where: { id },
      include: {
        preFacturas: true,
        ordenCompra: true
      }
    });

    if (!existente) throw new NotFoundError('Tipo de operacion SUNAT no encontrado');

    const totalRelaciones = 
      (existente.preFacturas?.length || 0) +
      (existente.ordenCompra?.length || 0);

    if (totalRelaciones > 0) {
      throw new ConflictError('No se puede eliminar el tipo porque tiene registros asociados.');
    }

    await prisma.tipoOperacionSunat.delete({ where: { id } });
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