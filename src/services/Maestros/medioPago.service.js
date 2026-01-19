import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para MedioPago
 * Incluye validaciones de unicidad y manejo de errores personalizados.
 * Documentado en español.
 */

async function listar() {
  try {
    return await prisma.medioPago.findMany({
      orderBy: { nombre: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

async function obtenerPorId(id) {
  try {
    const medioPago = await prisma.medioPago.findUnique({ where: { id } });
    if (!medioPago) throw new NotFoundError('Medio de pago no encontrado');
    return medioPago;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Valida que no exista un medio de pago duplicado con el mismo código o nombre.
 * Lanza ConflictError si ya existe un registro igual.
 * @param {Object} param0 - Objeto con los campos a validar
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarDuplicado({ codigo, nombre }, excluirId = null) {
  const where = {
    OR: [
      codigo ? { codigo } : undefined,
      nombre ? { nombre } : undefined
    ].filter(Boolean)
  };
  if (where.OR.length === 0) return;
  const existe = await prisma.medioPago.findFirst({ 
    where: excluirId ? { ...where, id: { not: excluirId } } : where 
  });
  if (existe) throw new ConflictError('Ya existe un medio de pago con el mismo código o nombre');
}

/**
 * Crea un medio de pago nuevo validando unicidad.
 * @param {Object} data - Datos del medio de pago
 * @returns {Promise<Object>} - Medio de pago creado
 */
async function crear(data) {
  try {
    if (!data.codigo) throw new ValidationError('El código es obligatorio');
    if (!data.nombre) throw new ValidationError('El nombre es obligatorio');
    
    await validarDuplicado(data);
    
    const dataNormalizada = {
      codigo: data.codigo.trim().toUpperCase(),
      nombre: data.nombre.trim().toUpperCase(),
      requiereBanco: Boolean(data.requiereBanco),
      requiereNumOperacion: Boolean(data.requiereNumOperacion),
      activo: data.activo !== undefined ? Boolean(data.activo) : true
    };
    
    return await prisma.medioPago.create({ data: dataNormalizada });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

/**
 * Actualiza un medio de pago existente, validando primero la existencia del ID y luego duplicados.
 * @param {BigInt|number} id - ID del medio de pago a actualizar
 * @param {Object} data - Datos a actualizar
 * @returns {Promise<Object>} - Medio de pago actualizado
 */
async function actualizar(id, data) {
  try {
    const existente = await prisma.medioPago.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Medio de pago no encontrado');

    await validarDuplicado(data, id);

    const dataNormalizada = {
      ...(data.codigo && { codigo: data.codigo.trim().toUpperCase() }),
      ...(data.nombre && { nombre: data.nombre.trim().toUpperCase() }),
      ...(data.requiereBanco !== undefined && { requiereBanco: Boolean(data.requiereBanco) }),
      ...(data.requiereNumOperacion !== undefined && { requiereNumOperacion: Boolean(data.requiereNumOperacion) }),
      ...(data.activo !== undefined && { activo: Boolean(data.activo) })
    };

    const actualizado = await prisma.medioPago.update({ where: { id }, data: dataNormalizada });
    return actualizado;
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
}

async function eliminar(id) {
  try {
    const existente = await prisma.medioPago.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Medio de pago no encontrado');
    await prisma.medioPago.delete({ where: { id } });
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