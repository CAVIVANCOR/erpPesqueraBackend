import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetInsumosTareaOT
 * Aplica validaciones de existencia de claves foráneas principales.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos del insumo
 */
async function validarForaneas(data) {
  // tareaId
  if (data.tareaId !== undefined && data.tareaId !== null) {
    const tarea = await prisma.detTareasOT.findUnique({ where: { id: data.tareaId } });
    if (!tarea) throw new ValidationError('La tarea referenciada no existe.');
  }
  // productoId
  if (data.productoId !== undefined && data.productoId !== null) {
    const prod = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!prod) throw new ValidationError('El producto referenciado no existe.');
  }
}

/**
 * Lista todos los insumos de tareas OT.
 */
const listar = async () => {
  try {
    return await prisma.detInsumosTareaOT.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un insumo por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const insumo = await prisma.detInsumosTareaOT.findUnique({ where: { id } });
    if (!insumo) throw new NotFoundError('DetInsumosTareaOT no encontrado');
    return insumo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un insumo validando existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.tareaId || !data.productoId) {
      throw new ValidationError('Los campos tareaId y productoId son obligatorios.');
    }
    await validarForaneas(data);
    return await prisma.detInsumosTareaOT.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un insumo existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detInsumosTareaOT.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetInsumosTareaOT no encontrado');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.detInsumosTareaOT.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un insumo por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detInsumosTareaOT.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetInsumosTareaOT no encontrado');
    await prisma.detInsumosTareaOT.delete({ where: { id } });
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
