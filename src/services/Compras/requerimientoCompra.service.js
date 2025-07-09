import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para RequerimientoCompra
 * Aplica validaciones de unicidad, existencia de claves foráneas y prevención de borrado si tiene detalles asociados.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del requerimiento
 */
async function validarForaneas(data) {
  // proveedorId (opcional)
  if (data.proveedorId !== undefined && data.proveedorId !== null) {
    const proveedor = await prisma.entidadComercial.findUnique({ where: { id: data.proveedorId } });
    if (!proveedor) throw new ValidationError('El proveedor referenciado no existe.');
  }
}

/**
 * Valida unicidad de código antes de crear o actualizar.
 * @param {string} codigo - Código a validar
 * @param {BigInt} [id] - ID a excluir (para update)
 */
async function validarUnicidadCodigo(codigo, id = null) {
  const existe = await prisma.requerimientoCompra.findFirst({ where: id ? { codigo, NOT: { id } } : { codigo } });
  if (existe) throw new ConflictError('El código ya está registrado para otro requerimiento de compra.');
}

/**
 * Lista todos los requerimientos de compra.
 */
const listar = async () => {
  try {
    return await prisma.requerimientoCompra.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un requerimiento por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const req = await prisma.requerimientoCompra.findUnique({ where: { id } });
    if (!req) throw new NotFoundError('RequerimientoCompra no encontrado');
    return req;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un requerimiento validando unicidad de código y existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.codigo || !data.empresaId || !data.estadoId) {
      throw new ValidationError('Los campos codigo, empresaId y estadoId son obligatorios.');
    }
    await validarForaneas(data);
    await validarUnicidadCodigo(data.codigo);
    return await prisma.requerimientoCompra.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un requerimiento existente, validando existencia, unicidad y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.requerimientoCompra.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('RequerimientoCompra no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    // Validar unicidad de código si se modifica
    if (data.codigo && data.codigo !== existente.codigo) {
      await validarUnicidadCodigo(data.codigo, id);
    }
    return await prisma.requerimientoCompra.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un requerimiento por ID, previniendo si tiene detalles asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.requerimientoCompra.findUnique({
      where: { id },
      include: { detalles: true }
    });
    if (!existente) throw new NotFoundError('RequerimientoCompra no encontrado');
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError('No se puede eliminar el requerimiento porque tiene detalles asociados.');
    }
    await prisma.requerimientoCompra.delete({ where: { id } });
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
