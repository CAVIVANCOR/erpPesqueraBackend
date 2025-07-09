import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TiposDocIdentidad
 * Aplica validaciones de unicidad y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad de codigo.
 * Lanza ValidationError si ya existe.
 * @param {Object} data - Datos del tipo de documento
 * @param {BigInt} [id] - ID del registro a excluir (para update)
 */
async function validarTipoDocIdentidad(data, id = null) {
  if (data.codigo !== undefined && data.codigo !== null) {
    const where = id ? { codigo: data.codigo, NOT: { id } } : { codigo: data.codigo };
    const existe = await prisma.tiposDocIdentidad.findFirst({ where });
    if (existe) throw new ValidationError('El código ya está registrado para otro tipo de documento de identidad.');
  }
}

/**
 * Lista todos los tipos de documento de identidad.
 */
const listar = async () => {
  try {
    return await prisma.tiposDocIdentidad.findMany({ include: { entidadesComerciales: true } });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de documento por ID (incluyendo entidades comerciales asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tiposDocIdentidad.findUnique({ where: { id }, include: { entidadesComerciales: true } });
    if (!tipo) throw new NotFoundError('Tipo de documento de identidad no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de documento de identidad validando unicidad de codigo.
 */
const crear = async (data) => {
  try {
    if (!data.codigo || !data.codSunat || !data.nombre) {
      throw new ValidationError('Los campos codigo, codSunat y nombre son obligatorios.');
    }
    await validarTipoDocIdentidad(data);
    return await prisma.tiposDocIdentidad.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de documento de identidad existente, validando existencia y unicidad de codigo.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tiposDocIdentidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de documento de identidad no encontrado');
    if (data.codigo !== undefined && (!data.codigo || data.codigo.trim() === '')) {
      throw new ValidationError('El campo codigo es obligatorio.');
    }
    if (data.codSunat !== undefined && (!data.codSunat || data.codSunat.trim() === '')) {
      throw new ValidationError('El campo codSunat es obligatorio.');
    }
    if (data.nombre !== undefined && (!data.nombre || data.nombre.trim() === '')) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    await validarTipoDocIdentidad(data, id);
    return await prisma.tiposDocIdentidad.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de documento de identidad por ID, validando existencia y que no tenga entidades comerciales asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tiposDocIdentidad.findUnique({ where: { id }, include: { entidadesComerciales: true } });
    if (!existente) throw new NotFoundError('Tipo de documento de identidad no encontrado');
    if (existente.entidadesComerciales && existente.entidadesComerciales.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene entidades comerciales asociadas.');
    }
    await prisma.tiposDocIdentidad.delete({ where: { id } });
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
