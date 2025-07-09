import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para SaldosProductoCliente
 * Aplica validaciones de unicidad y existencia de claves foráneas.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del saldo
 */
async function validarForaneas(data) {
  // productoId
  if (data.productoId !== undefined && data.productoId !== null) {
    const prod = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!prod) throw new ValidationError('El producto referenciado no existe.');
  }
  // clienteId (opcional)
  if (data.clienteId !== undefined && data.clienteId !== null) {
    const cli = await prisma.entidadComercial.findUnique({ where: { id: data.clienteId } });
    if (!cli) throw new ValidationError('El cliente referenciado no existe.');
  }
}

/**
 * Valida unicidad compuesta antes de crear o actualizar.
 * @param {Object} data - Datos del saldo
 * @param {BigInt} [id] - ID a excluir (para update)
 */
async function validarUnicidad(data, id = null) {
  const where = {
    empresaId: data.empresaId,
    almacenId: data.almacenId,
    productoId: data.productoId,
    clienteId: data.clienteId ?? null,
    custodia: data.custodia ?? false,
  };
  const existe = await prisma.saldosProductoCliente.findFirst({ where: id ? { ...where, NOT: { id } } : where });
  if (existe) throw new ConflictError('Ya existe un saldo registrado para esta combinación de empresa, almacén, producto, cliente y custodia.');
}

/**
 * Lista todos los saldos producto-cliente.
 */
const listar = async () => {
  try {
    return await prisma.saldosProductoCliente.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un saldo por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const saldo = await prisma.saldosProductoCliente.findUnique({ where: { id } });
    if (!saldo) throw new NotFoundError('SaldosProductoCliente no encontrado');
    return saldo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un saldo validando unicidad compuesta y existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.empresaId || !data.almacenId || !data.productoId || !data.saldoCantidad) {
      throw new ValidationError('Los campos empresaId, almacenId, productoId y saldoCantidad son obligatorios.');
    }
    await validarForaneas(data);
    await validarUnicidad(data);
    return await prisma.saldosProductoCliente.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un saldo existente, validando existencia, unicidad y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.saldosProductoCliente.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('SaldosProductoCliente no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    // Validar unicidad si se modifica algún campo de la clave compuesta
    const claves = ['empresaId', 'almacenId', 'productoId', 'clienteId', 'custodia'];
    if (claves.some(k => data[k] !== undefined && data[k] !== existente[k])) {
      await validarUnicidad({ ...existente, ...data }, id);
    }
    return await prisma.saldosProductoCliente.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un saldo por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.saldosProductoCliente.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('SaldosProductoCliente no encontrado');
    await prisma.saldosProductoCliente.delete({ where: { id } });
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
