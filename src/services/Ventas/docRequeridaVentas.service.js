import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DocRequeridaVentas
 * Gestiona el catálogo maestro de documentos requeridos para exportación
 * Incluye validaciones de relaciones y campos de auditoría.
 * Documentado en español.
 */

/**
 * Lista todos los documentos requeridos con sus relaciones
 */
const listar = async () => {
  try {
    return await prisma.docRequeridaVentas.findMany({
      include: {
        moneda: true,
        requisitosPorPais: {
          include: {
            pais: true,
            tipoProducto: true
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un documento requerido por ID
 */
const obtenerPorId = async (id) => {
  try {
    const documento = await prisma.docRequeridaVentas.findUnique({
      where: { id },
      include: {
        moneda: true,
        requisitosPorPais: {
          include: {
            pais: true,
            tipoProducto: true
          }
        }
      }
    });
    if (!documento) throw new NotFoundError('Documento requerido no encontrado');
    return documento;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene documentos activos
 */
const listarActivos = async () => {
  try {
    return await prisma.docRequeridaVentas.findMany({
      where: { activo: true },
      include: {
        moneda: true
      },
      orderBy: { nombre: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene documentos requeridos por país y tipo de producto
 */
const obtenerPorPaisYProducto = async (paisId, tipoProductoId = null) => {
  try {
    const where = {
      activo: true,
      requisitosPorPais: {
        some: {
          paisId,
          ...(tipoProductoId ? { tipoProductoId } : {})
        }
      }
    };
    
    return await prisma.docRequeridaVentas.findMany({
      where,
      include: {
        moneda: true,
        requisitosPorPais: {
          where: {
            paisId,
            ...(tipoProductoId ? { tipoProductoId } : {})
          }
        }
      },
      orderBy: { nombre: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un nuevo documento requerido
 */
const crear = async (data) => {
  try {
    if (!data.nombre) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    
    // Validar moneda si se proporciona
    if (data.monedaId) {
      const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
      if (!moneda) throw new ValidationError('Moneda no existente.');
    }
    
    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaCreacion: data.fechaCreacion || new Date(),
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };
    
    return await prisma.docRequeridaVentas.create({ 
      data: datosConAuditoria,
      include: {
        moneda: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un documento requerido existente
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.docRequeridaVentas.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Documento requerido no encontrado');
    
    // Validar moneda si se proporciona
    if (data.monedaId) {
      const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
      if (!moneda) throw new ValidationError('Moneda no existente.');
    }
    
    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaCreacion: data.fechaCreacion || existente.fechaCreacion || new Date(),
      creadoPor: data.creadoPor || existente.creadoPor || null,
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };
    
    return await prisma.docRequeridaVentas.update({ 
      where: { id }, 
      data: datosConAuditoria,
      include: {
        moneda: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un documento requerido
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.docRequeridaVentas.findUnique({
      where: { id },
      include: {
        documentosRequeridos: true,
        requisitosPorPais: true
      }
    });
    if (!existente) throw new NotFoundError('Documento requerido no encontrado');
    
    // Validar que no tenga registros asociados
    if (existente.documentosRequeridos && existente.documentosRequeridos.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene cotizaciones asociadas.');
    }
    if (existente.requisitosPorPais && existente.requisitosPorPais.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene requisitos por país configurados.');
    }
    
    await prisma.docRequeridaVentas.delete({ where: { id } });
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
  listarActivos,
  obtenerPorPaisYProducto,
  crear,
  actualizar,
  eliminar
};