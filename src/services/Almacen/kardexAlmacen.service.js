import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para KardexAlmacen
 * Aplica validaciones de existencia de claves foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del kardex
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
  // tipoMovimientoId
  if (data.tipoMovimientoId !== undefined && data.tipoMovimientoId !== null) {
    const tipoMov = await prisma.tipoMovimientoAlmacen.findUnique({ where: { id: data.tipoMovimientoId } });
    if (!tipoMov) throw new ValidationError('El tipo de movimiento referenciado no existe.');
  }
  // conceptoMovAlmacenId
  if (data.conceptoMovAlmacenId !== undefined && data.conceptoMovAlmacenId !== null) {
    const concepto = await prisma.conceptoMovAlmacen.findUnique({ where: { id: data.conceptoMovAlmacenId } });
    if (!concepto) throw new ValidationError('El concepto de movimiento referenciado no existe.');
  }
}

/**
 * Lista todos los registros de kardex de almacén.
 */
const listar = async () => {
  try {
    return await prisma.kardexAlmacen.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un registro de kardex por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const kardex = await prisma.kardexAlmacen.findUnique({ where: { id } });
    if (!kardex) throw new NotFoundError('KardexAlmacen no encontrado');
    return kardex;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un registro de kardex validando existencia de claves foráneas principales y campos obligatorios.
 */
const crear = async (data) => {
  try {
    if (!data.empresaId || !data.almacenId || !data.productoId || !data.fechaMovimiento || typeof data.ingreso !== 'boolean' || !data.tipoMovimientoId || !data.conceptoMovAlmacenId || !data.cantidad || !data.saldoCantidad) {
      throw new ValidationError('Faltan campos obligatorios: empresaId, almacenId, productoId, fechaMovimiento, ingreso, tipoMovimientoId, conceptoMovAlmacenId, cantidad y saldoCantidad.');
    }
    await validarForaneas(data);
    return await prisma.kardexAlmacen.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un registro de kardex existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.kardexAlmacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('KardexAlmacen no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.kardexAlmacen.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un registro de kardex por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.kardexAlmacen.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('KardexAlmacen no encontrado');
    await prisma.kardexAlmacen.delete({ where: { id } });
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
