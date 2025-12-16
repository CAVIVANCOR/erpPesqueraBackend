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
        otMantenimiento: { select: { id: true, numeroCompleto: true } },
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
        insumos: {
          select: {
            id: true,
            producto: { select: { id: true, codigo: true, descripcionBase: true } },
            cantidadRequerida: true,
            cantidadConsumida: true,
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
        insumos: {
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
    
    // Auto-calcular numeroTarea si no se proporciona
    let numeroTarea = data.numeroTarea;
    if (!numeroTarea) {
      const maxTarea = await prisma.detTareasOT.findFirst({
        where: { otMantenimientoId: data.otMantenimientoId },
        orderBy: { numeroTarea: 'desc' },
        select: { numeroTarea: true }
      });
      numeroTarea = maxTarea ? maxTarea.numeroTarea + 1 : 1;
    }
    
    // Filtrar solo los campos que existen en el schema de Prisma
    const datosValidos = {
      otMantenimientoId: data.otMantenimientoId,
      numeroTarea: numeroTarea,
      descripcion: data.descripcion,
      responsableId: data.responsableId || null,
      personalValidaId: data.personalValidaId || null,
      contratistaId: data.contratistaId || null,
      fechaProgramada: data.fechaProgramada || null,
      fechaInicio: data.fechaInicio || null,
      fechaFin: data.fechaFin || null,
      estadoTareaId: data.estadoTareaId,
      realizado: data.realizado || false,
      observaciones: data.observaciones || null,
      creadoPor: data.creadoPor || null,
      actualizadoPor: data.actualizadoPor || null,
    };
    
    return await prisma.detTareasOT.create({ data: datosValidos });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) {
      console.error('Error Prisma detallado:', err);
      throw new DatabaseError('Error de base de datos', err.message);
    }
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
    
    // Filtrar solo los campos que existen en el schema de Prisma
    const datosValidos = {};
    if (data.numeroTarea !== undefined) datosValidos.numeroTarea = data.numeroTarea;
    if (data.descripcion !== undefined) datosValidos.descripcion = data.descripcion;
    if (data.responsableId !== undefined) datosValidos.responsableId = data.responsableId;
    if (data.personalValidaId !== undefined) datosValidos.personalValidaId = data.personalValidaId;
    if (data.contratistaId !== undefined) datosValidos.contratistaId = data.contratistaId;
    if (data.fechaProgramada !== undefined) datosValidos.fechaProgramada = data.fechaProgramada;
    if (data.fechaInicio !== undefined) datosValidos.fechaInicio = data.fechaInicio;
    if (data.fechaFin !== undefined) datosValidos.fechaFin = data.fechaFin;
    if (data.estadoTareaId !== undefined) datosValidos.estadoTareaId = data.estadoTareaId;
    if (data.realizado !== undefined) datosValidos.realizado = data.realizado;
    if (data.observaciones !== undefined) datosValidos.observaciones = data.observaciones;
    if (data.actualizadoPor !== undefined) datosValidos.actualizadoPor = data.actualizadoPor;
    
    return await prisma.detTareasOT.update({ where: { id }, data: datosValidos });
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
