// Servicio para TipoReferenciaMovimientoCaja
import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Valida que no exista un tipo de referencia con el mismo código (unicidad)
 */
async function validarUnicidadCodigo(codigo, excluirId = null) {
  const where = { codigo };
  if (excluirId) where.id = { not: excluirId };
  const existe = await prisma.tipoReferenciaMovimientoCaja.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un tipo de referencia con ese código.');
}

/**
 * Lista todos los tipos de referencia de movimiento de caja
 */
const listar = async () => {
  try {
    return await prisma.tipoReferenciaMovimientoCaja.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de referencia por ID
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoReferenciaMovimientoCaja.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundError('Tipo de referencia no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un nuevo tipo de referencia
 */
const crear = async (data) => {
  try {
    await validarUnicidadCodigo(data.codigo);
    return await prisma.tipoReferenciaMovimientoCaja.create({ data });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de referencia existente
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoReferenciaMovimientoCaja.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('ID de TipoReferenciaMovimientoCaja no existe');
    if (data.codigo) await validarUnicidadCodigo(data.codigo, id);
    return await prisma.tipoReferenciaMovimientoCaja.update({ where: { id }, data });
  } catch (err) {
    if (err.code === 'P2025') throw new NotFoundError('Tipo de referencia no encontrado');
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de referencia por ID
 */
const eliminar = async (id) => {
  try {
    await prisma.tipoReferenciaMovimientoCaja.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err.code === 'P2025') throw new NotFoundError('Tipo de referencia no encontrado');
    if (err.code === 'P2003') throw new ConflictError('No se puede eliminar el tipo de referencia porque está asociado a otros registros.');
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
