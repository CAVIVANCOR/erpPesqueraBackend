import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetTareasOT
 * Aplica validaciones de existencia de claves foráneas principales.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos de la tarea
 */
async function validarForaneas(data) {
  // otMantenimientoId
  if (data.otMantenimientoId !== undefined && data.otMantenimientoId !== null) {
    const ot = await prisma.oTMantenimiento.findUnique({ where: { id: data.otMantenimientoId } });
    if (!ot) throw new ValidationError('La OT de mantenimiento referenciada no existe.');
  }
}

/**
 * Lista todas las tareas de OT con relaciones.
 */
const listar = async () => {
  try {
    return await prisma.detTareasOT.findMany({
      include: {
        otMantenimiento: { select: { id: true, codigo: true } },
        responsable: { select: { id: true, nombres: true, apellidos: true } },
        personalValida: { select: { id: true, nombres: true, apellidos: true } },
        contratista: { select: { id: true, razonSocial: true } },
        estadoTarea: { select: { id: true, descripcion: true, severityColor: true } }
      },
      orderBy: { numeroTarea: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista tareas de una OT específica con relaciones.
 * @param {BigInt} otMantenimientoId - ID de la OT
 */
const listarPorOT = async (otMantenimientoId) => {
  try {
    return await prisma.detTareasOT.findMany({
      where: { otMantenimientoId },
      include: {
        responsable: { select: { id: true, nombres: true, apellidos: true } },
        personalValida: { select: { id: true, nombres: true, apellidos: true } },
        contratista: { select: { id: true, razonSocial: true } },
        estadoTarea: { select: { id: true, descripcion: true, severityColor: true } },
        insumosOT: {
          select: {
            id: true,
            producto: { select: { id: true, codigo: true, descripcion: true } },
            cantidad: true,
            estadoInsumo: { select: { id: true, descripcion: true, severityColor: true } }
          }
        }
      },
      orderBy: { numeroTarea: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una tarea por ID con relaciones.
 */
const obtenerPorId = async (id) => {
  try {
    const tarea = await prisma.detTareasOT.findUnique({ 
      where: { id },
      include: {
        otMantenimiento: true,
        responsable: true,
        personalValida: true,
        contratista: true,
        estadoTarea: true,
        insumosOT: {
          include: {
            producto: true,
            estadoInsumo: true
          }
        }
      }
    });
    if (!tarea) throw new NotFoundError('DetTareasOT no encontrada');
    return tarea;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una tarea validando existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.otMantenimientoId || !data.descripcion) {
      throw new ValidationError('Los campos otMantenimientoId y descripcion son obligatorios.');
    }
    await validarForaneas(data);
    return await prisma.detTareasOT.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una tarea existente, validando existencia y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detTareasOT.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetTareasOT no encontrada');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    return await prisma.detTareasOT.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una tarea por ID, validando existencia.
 * Si tiene insumos asociados, lanza ConflictError.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detTareasOT.findUnique({
      where: { id },
      include: { insumos: true }
    });
    if (!existente) throw new NotFoundError('DetTareasOT no encontrada');
    if (existente.insumos && existente.insumos.length > 0) {
      throw new ConflictError('No se puede eliminar la tarea porque tiene insumos asociados.');
    }
    await prisma.detTareasOT.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  listarPorOT,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
