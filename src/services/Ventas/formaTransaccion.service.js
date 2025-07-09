import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para FormaTransaccion
 * Aplica validación de unicidad y prevención de borrado si tiene cotizaciones asociadas.
 * Documentado en español.
 */

async function validarUnicidadNombre(nombre, id = null) {
  const where = id ? { nombre, NOT: { id } } : { nombre };
  const existe = await prisma.formaTransaccion.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe una forma de transacción con ese nombre.');
}

const listar = async () => {
  try {
    return await prisma.formaTransaccion.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const forma = await prisma.formaTransaccion.findUnique({ where: { id } });
    if (!forma) throw new NotFoundError('FormaTransaccion no encontrada');
    return forma;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.nombre) throw new ValidationError('El campo nombre es obligatorio.');
    await validarUnicidadNombre(data.nombre);
    return await prisma.formaTransaccion.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.formaTransaccion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('FormaTransaccion no encontrada');
    if (data.nombre && data.nombre !== existente.nombre) {
      await validarUnicidadNombre(data.nombre, id);
    }
    return await prisma.formaTransaccion.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.formaTransaccion.findUnique({
      where: { id },
      include: { cotizaciones: true, cotizacionesCompras: true }
    });
    if (!existente) throw new NotFoundError('FormaTransaccion no encontrada');
    if ((existente.cotizaciones && existente.cotizaciones.length > 0) || (existente.cotizacionesCompras && existente.cotizacionesCompras.length > 0)) {
      throw new ConflictError('No se puede eliminar la forma de transacción porque tiene cotizaciones asociadas.');
    }
    await prisma.formaTransaccion.delete({ where: { id } });
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
