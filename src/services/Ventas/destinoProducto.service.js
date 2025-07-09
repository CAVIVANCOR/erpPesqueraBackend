import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DestinoProducto
 * Aplica validación de unicidad y prevención de borrado si tiene cotizaciones asociadas.
 * Documentado en español.
 */

async function validarUnicidadNombre(nombre, id = null) {
  const where = id ? { nombre, NOT: { id } } : { nombre };
  const existe = await prisma.destinoProducto.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un destino de producto con ese nombre.');
}

const listar = async () => {
  try {
    return await prisma.destinoProducto.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const destino = await prisma.destinoProducto.findUnique({ where: { id } });
    if (!destino) throw new NotFoundError('DestinoProducto no encontrado');
    return destino;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.nombre) throw new ValidationError('El campo nombre es obligatorio.');
    await validarUnicidadNombre(data.nombre);
    return await prisma.destinoProducto.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.destinoProducto.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DestinoProducto no encontrado');
    if (data.nombre && data.nombre !== existente.nombre) {
      await validarUnicidadNombre(data.nombre, id);
    }
    return await prisma.destinoProducto.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.destinoProducto.findUnique({
      where: { id },
      include: { cotizaciones: true, cotizacionesCompras: true }
    });
    if (!existente) throw new NotFoundError('DestinoProducto no encontrado');
    if ((existente.cotizaciones && existente.cotizaciones.length > 0) || (existente.cotizacionesCompras && existente.cotizacionesCompras.length > 0)) {
      throw new ConflictError('No se puede eliminar el destino de producto porque tiene cotizaciones asociadas.');
    }
    await prisma.destinoProducto.delete({ where: { id } });
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
