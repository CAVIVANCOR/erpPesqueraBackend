import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoContrato
 * Aplica validaciones de unicidad, referencias y manejo de errores personalizado.
 * Documentado en español técnico.
 */

/**
 * Lista todos los tipos de contrato.
 */
const listar = async () => {
  try {
    return await prisma.tipoContrato.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de contrato por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoContrato.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundError('Tipo de contrato no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de contrato nuevo validando unicidad.
 */
const crear = async (data) => {
  try {
    await validarTipoContrato(data);
    return await prisma.tipoContrato.create({ data });
  } catch (err) {
    if (err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de contrato existente, validando existencia y unicidad.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoContrato.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de contrato no encontrado');
    await validarTipoContrato(data, id);
    return await prisma.tipoContrato.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de contrato por ID, validando existencia y que no tenga personal asociado.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoContrato.findUnique({
      where: { id },
      include: { personal: true }
    });
    if (!existente) throw new NotFoundError('Tipo de contrato no encontrado');
    if (existente.personal && existente.personal.length > 0) {
      throw new ConflictError('No se puede eliminar el tipo de contrato porque tiene personal asociado.');
    }
    await prisma.tipoContrato.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Valida unicidad de código y nombre para TipoContrato.
 */
async function validarTipoContrato(data, id = null) {
  // Validar código único
  const whereCodigo = id ? { codigo: data.codigo, NOT: { id } } : { codigo: data.codigo };
  const existeCodigo = await prisma.tipoContrato.findFirst({ where: whereCodigo });
  if (existeCodigo) throw new ConflictError('El código ya existe para otro tipo de contrato.');
  // Validar nombre único opcional (si aplica)
  // const whereNombre = id ? { nombre: data.nombre, NOT: { id } } : { nombre: data.nombre };
  // const existeNombre = await prisma.tipoContrato.findFirst({ where: whereNombre });
  // if (existeNombre) throw new ConflictError('El nombre ya existe para otro tipo de contrato.');
}

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
