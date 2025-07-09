import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Banco
 * Incluye validaciones de unicidad y manejo de errores personalizados.
 * Documentado en español.
 */

async function listar() {
  try {
    return await prisma.banco.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

async function obtenerPorId(id) {
  try {
    const banco = await prisma.banco.findUnique({ where: { id } });
    if (!banco) throw new NotFoundError('Banco no encontrado');
    return banco;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Valida que existan las referencias foráneas requeridas antes de crear o actualizar un banco.
 * Lanza ValidationError si alguna referencia no existe.
 * @param {Object} data - Objeto con los IDs a validar
 */
async function validarReferencias({ paisId }) {
  if (paisId !== undefined) {
    const pais = await prisma.pais.findUnique({ where: { id: paisId } });
    if (!pais) throw new ValidationError('País no existente');
  }
}

/**
 * Valida que no exista un banco duplicado con el mismo nombre, código Swift o código BCRP.
 * Lanza ConflictError si ya existe un registro igual.
 * @param {Object} param0 - Objeto con los campos a validar
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarDuplicado({ nombre, codigoSwift, codigoBcrp }, excluirId = null) {
  const where = {
    OR: [
      nombre ? { nombre } : undefined,
      codigoSwift ? { codigoSwift } : undefined,
      codigoBcrp ? { codigoBcrp } : undefined
    ].filter(Boolean)
  };
  if (where.OR.length === 0) return;
  const existe = await prisma.banco.findFirst({ where: excluirId ? { ...where, id: { not: excluirId } } : where });
  if (existe) throw new ConflictError('Ya existe un banco con el mismo nombre o código');
}

/**
 * Crea un banco nuevo validando referencias y unicidad.
 * @param {Object} data - Datos del banco
 * @returns {Promise<Object>} - Banco creado
 */
async function crear(data) {
  try {
    await validarReferencias(data);
    await validarDuplicado(data);
    return await prisma.banco.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Actualiza un banco existente, validando primero la existencia del ID, luego referencias y duplicados.
 * @param {BigInt|number} id - ID del banco a actualizar
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - Banco actualizado
 */
async function actualizar(id, data) {
  try {
    // Primero valida existencia del banco
    const existente = await prisma.banco.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Banco no encontrado');

    // Valida referencias foráneas
    await validarReferencias(data);

    // Valida duplicados
    await validarDuplicado(data, id);

    // Realiza la actualización
    const actualizado = await prisma.banco.update({ where: { id }, data });
    return actualizado;
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}


async function eliminar(id) {
  try {
    const existente = await prisma.banco.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Banco no encontrado');
    await prisma.banco.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
