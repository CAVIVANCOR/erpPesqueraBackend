import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoMantenimiento
 * Aplica validaciones de campo obligatorio y prevención de borrado si tiene órdenes asociadas.
 * Documentado en español.
 */

/**
 * Lista todos los tipos de mantenimiento.
 */
const listar = async () => {
  try {
    return await prisma.tipoMantenimiento.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de mantenimiento por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoMantenimiento.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundError('TipoMantenimiento no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de mantenimiento validando campo obligatorio.
 */
const crear = async (data) => {
  try {
    if (!data.nombre) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    if (data.nombre.length > 40) {
      throw new ValidationError('El nombre no puede superar los 40 caracteres.');
    }
    return await prisma.tipoMantenimiento.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de mantenimiento existente, validando campo obligatorio.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoMantenimiento.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TipoMantenimiento no encontrado');
    if (data.nombre && data.nombre.length > 40) {
      throw new ValidationError('El nombre no puede superar los 40 caracteres.');
    }
    return await prisma.tipoMantenimiento.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de mantenimiento por ID, previniendo si tiene órdenes asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoMantenimiento.findUnique({
      where: { id },
      include: { ordenesTrabajo: true }
    });
    if (!existente) throw new NotFoundError('TipoMantenimiento no encontrado');
    if (existente.ordenesTrabajo && existente.ordenesTrabajo.length > 0) {
      throw new ConflictError('No se puede eliminar el tipo de mantenimiento porque tiene órdenes de trabajo asociadas.');
    }
    await prisma.tipoMantenimiento.delete({ where: { id } });
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
