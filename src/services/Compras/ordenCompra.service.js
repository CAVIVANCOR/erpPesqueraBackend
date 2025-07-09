import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para OrdenCompra
 * Aplica validaciones de unicidad, existencia de claves foráneas y prevención de borrado si tiene detalles asociados.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos de la orden
 */
async function validarForaneas(data) {
  // proveedorId
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
  const existe = await prisma.ordenCompra.findFirst({ where: id ? { codigo, NOT: { id } } : { codigo } });
  if (existe) throw new ConflictError('El código ya está registrado para otra orden de compra.');
}

/**
 * Lista todas las órdenes de compra.
 */
const listar = async () => {
  try {
    return await prisma.ordenCompra.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una orden por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const orden = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!orden) throw new NotFoundError('OrdenCompra no encontrada');
    return orden;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una orden validando unicidad de código y existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.codigo || !data.empresaId || !data.proveedorId || !data.estadoId) {
      throw new ValidationError('Los campos codigo, empresaId, proveedorId y estadoId son obligatorios.');
    }
    await validarForaneas(data);
    await validarUnicidadCodigo(data.codigo);
    return await prisma.ordenCompra.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una orden existente, validando existencia, unicidad y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.ordenCompra.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('OrdenCompra no encontrada');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    // Validar unicidad de código si se modifica
    if (data.codigo && data.codigo !== existente.codigo) {
      await validarUnicidadCodigo(data.codigo, id);
    }
    return await prisma.ordenCompra.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una orden por ID, previniendo si tiene detalles asociados.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.ordenCompra.findUnique({
      where: { id },
      include: { detalles: true }
    });
    if (!existente) throw new NotFoundError('OrdenCompra no encontrada');
    if (existente.detalles && existente.detalles.length > 0) {
      throw new ConflictError('No se puede eliminar la orden porque tiene detalles asociados.');
    }
    await prisma.ordenCompra.delete({ where: { id } });
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
