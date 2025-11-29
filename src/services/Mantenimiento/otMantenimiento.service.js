import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para OTMantenimiento
 * Aplica validaciones de unicidad y existencia de claves foráneas.
 * Documentado en español.
 */

/**
 * Valida existencia de claves foráneas principales.
 * Lanza ValidationError si no existe alguna clave foránea requerida.
 * @param {Object} data - Datos de la OT
 */
async function validarForaneas(data) {
  // tipoMantenimientoId
  if (data.tipoMantenimientoId !== undefined && data.tipoMantenimientoId !== null) {
    const tipoMant = await prisma.tipoMantenimiento.findUnique({ where: { id: data.tipoMantenimientoId } });
    if (!tipoMant) throw new ValidationError('El tipo de mantenimiento referenciado no existe.');
  }
  // motivoOriginoId
  if (data.motivoOriginoId !== undefined && data.motivoOriginoId !== null) {
    const motivo = await prisma.motivoOriginoOT.findUnique({ where: { id: data.motivoOriginoId } });
    if (!motivo) throw new ValidationError('El motivo de origen referenciado no existe.');
  }
}

/**
 * Lista todas las órdenes de trabajo de mantenimiento con relaciones completas.
 */
const listar = async () => {
  try {
    const result = await prisma.oTMantenimiento.findMany({
      include: {
        empresa: { select: { id: true, razonSocial: true, ruc: true } },
        sede: { select: { id: true, nombre: true } },
        activo: { select: { id: true, nombre: true } },
        tipoMantenimiento: { select: { id: true, nombre: true } },
        motivoOrigino: { select: { id: true, nombre: true } },
        estado: { select: { id: true, descripcion: true, severityColor: true } },
        moneda: { select: { id: true, codigoSunat: true, simbolo: true } },
        solicitante: { select: { id: true, nombres: true, apellidos: true } },
        responsable: { select: { id: true, nombres: true, apellidos: true } },
        autorizadoPor: { select: { id: true, nombres: true, apellidos: true } },
        validadoPor: { select: { id: true, nombres: true, apellidos: true } },
        tipoDocumento: { select: { id: true, codigo: true, descripcion: true } },
        serieDoc: { select: { id: true, serie: true } },
        tareas: {
          select: {
            id: true,
            numeroTarea: true,
            descripcion: true,
            estadoTareaId: true,
            realizado: true
          }
        }
      },
      orderBy: { fechaDocumento: 'desc' }
    });
    console.log(`[OT Service] Listado: ${result.length} registros encontrados`);
    return result;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una OT por ID con todas sus relaciones.
 */
const obtenerPorId = async (id) => {
  try {
    const ot = await prisma.oTMantenimiento.findUnique({ 
      where: { id },
      include: {
        empresa: true,
        sede: true,
        activo: true,
        tipoMantenimiento: true,
        motivoOrigino: true,
        estado: true,
        moneda: true,
        solicitante: true,
        responsable: true,
        autorizadoPor: true,
        validadoPor: true,
        tipoDocumento: true,
        serieDoc: true,
        tareas: {
          include: {
            responsable: { select: { id: true, nombres: true, apellidos: true } },
            personalValida: { select: { id: true, nombres: true, apellidos: true } },
            contratista: { select: { id: true, razonSocial: true } },
            estadoTarea: { select: { id: true, descripcion: true, severityColor: true } },
            insumos: {
              include: {
                producto: { select: { id: true, codigo: true, descripcionBase: true } },
                estadoInsumo: { select: { id: true, descripcion: true, severityColor: true } }
              }
            }
          }
        },
        permisosGestionados: true
      }
    });
    if (!ot) throw new NotFoundError('OTMantenimiento no encontrada');
    return ot;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una OT validando campos obligatorios y existencia de claves foráneas.
 */
const crear = async (data) => {
  try {
    if (!data.empresaId || !data.tipoDocumentoId || !data.serieDocId || !data.activoId || !data.tipoMantenimientoId || !data.motivoOriginoId || !data.estadoId || !data.monedaId) {
      throw new ValidationError('Los campos empresaId, tipoDocumentoId, serieDocId, activoId, tipoMantenimientoId, motivoOriginoId, estadoId y monedaId son obligatorios.');
    }
    await validarForaneas(data);
    
    // Limpiar data: eliminar id, campos null y strings vacíos opcionales
    const { id, ...dataLimpia } = data;
    Object.keys(dataLimpia).forEach(key => {
      if (dataLimpia[key] === null || dataLimpia[key] === '') {
        delete dataLimpia[key];
      }
    });
    
    return await prisma.oTMantenimiento.create({ data: dataLimpia });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza una OT existente, validando existencia, unicidad y claves foráneas si se modifican.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.oTMantenimiento.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('OTMantenimiento no encontrada');
    // Validar foráneas si se modifican
    await validarForaneas({ ...existente, ...data });
    
    // Validar campos obligatorios
    if (data.tipoDocumentoId === undefined || data.tipoDocumentoId === null) {
      throw new ValidationError('El campo tipoDocumentoId es obligatorio.');
    }
    if (data.serieDocId === undefined || data.serieDocId === null) {
      throw new ValidationError('El campo serieDocId es obligatorio.');
    }
    if (data.numeroSerie === undefined || data.numeroSerie === null) {
      throw new ValidationError('El campo numeroSerie es obligatorio.');
    }
    if (data.numeroCorrelativo === undefined || data.numeroCorrelativo === null) {
      throw new ValidationError('El campo numeroCorrelativo es obligatorio.');
    }
    if (data.numeroCompleto === undefined || data.numeroCompleto === null) {
      throw new ValidationError('El campo numeroCompleto es obligatorio.');
    }
    if (data.monedaId === undefined || data.monedaId === null) {
      throw new ValidationError('El campo monedaId es obligatorio.');
    }
    
    // Limpiar data: eliminar campos null y strings vacíos opcionales
    const dataLimpia = { ...data };
    Object.keys(dataLimpia).forEach(key => {
      if (dataLimpia[key] === null || dataLimpia[key] === '') {
        delete dataLimpia[key];
      }
    });
    
    return await prisma.oTMantenimiento.update({ where: { id }, data: dataLimpia });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina una OT por ID, validando existencia y que no tenga tareas asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.oTMantenimiento.findUnique({ 
      where: { id },
      include: { tareas: true }
    });
    if (!existente) throw new NotFoundError('OTMantenimiento no encontrada');
    
    // Validar que no tenga tareas asociadas
    if (existente.tareas && existente.tareas.length > 0) {
      throw new ConflictError('No se puede eliminar la orden de trabajo porque tiene tareas asociadas.');
    }
    
    await prisma.oTMantenimiento.delete({ where: { id } });
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
