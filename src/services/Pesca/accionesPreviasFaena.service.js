import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para AccionesPreviasFaena
 * Valida unicidad de nombre y previene borrado si tiene detalles asociados.
 * Documentado en español.
 */

async function validarUnicidadNombre(nombre, id = null) {
  const where = id ? { nombre, NOT: { id } } : { nombre };
  const existe = await prisma.accionesPreviasFaena.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe una acción previa con ese nombre.');
}

async function tieneDependencias(id) {
  const accion = await prisma.accionesPreviasFaena.findUnique({
    where: { id },
    include: {
      detalles: true,
      detallesConsumo: true
    }
  });
  if (!accion) throw new NotFoundError('AccionesPreviasFaena no encontrada');
  return (
    (accion.detalles && accion.detalles.length > 0) ||
    (accion.detallesConsumo && accion.detallesConsumo.length > 0)
  );
}

const listar = async () => {
  try {
    return await prisma.accionesPreviasFaena.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const accion = await prisma.accionesPreviasFaena.findUnique({ where: { id } });
    if (!accion) throw new NotFoundError('AccionesPreviasFaena no encontrada');
    return accion;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.nombre) throw new ValidationError('El campo nombre es obligatorio.');
    await validarUnicidadNombre(data.nombre);
    return await prisma.accionesPreviasFaena.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.accionesPreviasFaena.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('AccionesPreviasFaena no encontrada');
    if (data.nombre && data.nombre !== existente.nombre) {
      await validarUnicidadNombre(data.nombre, id);
    }
    return await prisma.accionesPreviasFaena.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    if (await tieneDependencias(id)) {
      throw new ConflictError('No se puede eliminar porque tiene detalles asociados.');
    }
    await prisma.accionesPreviasFaena.delete({ where: { id } });
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
