import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para ParametroAprobador
 * Aplica validaciones de campos obligatorios y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Lista todos los parámetros aprobadores.
 */
const listar = async () => {
  try {
    return await prisma.parametroAprobador.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un parámetro aprobador por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const parametro = await prisma.parametroAprobador.findUnique({ where: { id } });
    if (!parametro) throw new NotFoundError('ParametroAprobador no encontrado');
    return parametro;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un parámetro aprobador validando campos obligatorios.
 */
const crear = async (data) => {
  try {
    if (!data.personalRespId || !data.moduloSistemaId || !data.empresaId || !data.vigenteDesde) {
      throw new ValidationError('Los campos personalRespId, moduloSistemaId, empresaId y vigenteDesde son obligatorios.');
    }
    return await prisma.parametroAprobador.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un parámetro aprobador existente, validando existencia y campos obligatorios si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.parametroAprobador.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('ParametroAprobador no encontrado');
    if (data.personalRespId !== undefined && (!data.personalRespId)) {
      throw new ValidationError('El campo personalRespId es obligatorio.');
    }
    if (data.moduloSistemaId !== undefined && (!data.moduloSistemaId)) {
      throw new ValidationError('El campo moduloSistemaId es obligatorio.');
    }
    if (data.empresaId !== undefined && (!data.empresaId)) {
      throw new ValidationError('El campo empresaId es obligatorio.');
    }
    if (data.vigenteDesde !== undefined && (!data.vigenteDesde)) {
      throw new ValidationError('El campo vigenteDesde es obligatorio.');
    }
    return await prisma.parametroAprobador.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un parámetro aprobador por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.parametroAprobador.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('ParametroAprobador no encontrado');
    await prisma.parametroAprobador.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
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
