import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoEmbarcacion
 * Valida unicidad de código y previene borrado si tiene embarcaciones asociadas.
 * Documentado en español.
 */

async function validarUnicidadCodigo(codigo, id = null) {
  const where = id ? { codigo, NOT: { id } } : { codigo };
  const existe = await prisma.tipoEmbarcacion.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un TipoEmbarcacion con ese código.');
}

const listar = async () => {
  try {
    return await prisma.tipoEmbarcacion.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoEmbarcacion.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundError('TipoEmbarcacion no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.codigo || !data.nombre) {
      throw new ValidationError('Los campos código y nombre son obligatorios.');
    }
    await validarUnicidadCodigo(data.codigo);
    return await prisma.tipoEmbarcacion.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoEmbarcacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TipoEmbarcacion no encontrado');
    if (data.codigo && data.codigo !== existente.codigo) {
      await validarUnicidadCodigo(data.codigo, id);
    }
    return await prisma.tipoEmbarcacion.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoEmbarcacion.findUnique({
      where: { id },
      include: { embarcaciones: true }
    });
    if (!existente) throw new NotFoundError('TipoEmbarcacion no encontrado');
    if (existente.embarcaciones && existente.embarcaciones.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene embarcaciones asociadas.');
    }
    await prisma.tipoEmbarcacion.delete({ where: { id } });
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
