import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Incoterm
 * Valida unicidad de código y previene borrado si tiene pre-facturas asociadas.
 * Documentado en español.
 */

async function validarUnicidadCodigo(codigo, id = null) {
  const where = id ? { codigo, NOT: { id } } : { codigo };
  const existe = await prisma.incoterm.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un Incoterm con ese código.');
}

const listar = async () => {
  try {
    return await prisma.incoterm.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const incoterm = await prisma.incoterm.findUnique({ where: { id } });
    if (!incoterm) throw new NotFoundError('Incoterm no encontrado');
    return incoterm;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.codigo || !data.descripcion) {
      throw new ValidationError('Los campos código y descripción son obligatorios.');
    }
    await validarUnicidadCodigo(data.codigo);
    return await prisma.incoterm.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.incoterm.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Incoterm no encontrado');
    if (data.codigo && data.codigo !== existente.codigo) {
      await validarUnicidadCodigo(data.codigo, id);
    }
    return await prisma.incoterm.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.incoterm.findUnique({
      where: { id },
      include: { preFacturas: true }
    });
    if (!existente) throw new NotFoundError('Incoterm no encontrado');
    if (existente.preFacturas && existente.preFacturas.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene pre-facturas asociadas.');
    }
    await prisma.incoterm.delete({ where: { id } });
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
