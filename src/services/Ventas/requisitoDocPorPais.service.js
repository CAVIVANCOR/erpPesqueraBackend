import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para RequisitoDocPorPais
 * Gestiona los requisitos de documentos específicos por país y tipo de producto
 * Incluye validaciones de relaciones y campos de auditoría.
 * Documentado en español.
 */

/**
 * Valida que no exista un requisito duplicado
 */
async function validarUnicidad(docRequeridaVentasId, paisId, tipoProductoId, id = null) {
  const where = {
    docRequeridaVentasId,
    paisId,
    tipoProductoId,
    ...(id ? { NOT: { id } } : {})
  };
  
  const existe = await prisma.requisitoDocPorPais.findFirst({ where });
  if (existe) {
    throw new ConflictError('Ya existe un requisito para este documento, país y tipo de producto.');
  }
}

/**
 * Lista todos los requisitos con sus relaciones
 */
const listar = async () => {
  try {
    return await prisma.requisitoDocPorPais.findMany({
      include: {
        docRequeridaVentas: true,
        pais: true,
        tipoProducto: true
      },
      orderBy: [
        { paisId: 'asc' },
        { tipoProductoId: 'asc' }
      ]
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un requisito por ID
 */
const obtenerPorId = async (id) => {
  try {
    const requisito = await prisma.requisitoDocPorPais.findUnique({
      where: { id },
      include: {
        docRequeridaVentas: true,
        pais: true,
        tipoProducto: true
      }
    });
    if (!requisito) throw new NotFoundError('Requisito no encontrado');
    return requisito;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene requisitos por país
 */
const obtenerPorPais = async (paisId) => {
  try {
    return await prisma.requisitoDocPorPais.findMany({
      where: { paisId },
      include: {
        docRequeridaVentas: true,
        tipoProducto: true
      },
      orderBy: { tipoProductoId: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene requisitos por documento requerido
 */
const obtenerPorDocumento = async (docRequeridaVentasId) => {
  try {
    return await prisma.requisitoDocPorPais.findMany({
      where: { docRequeridaVentasId },
      include: {
        pais: true,
        tipoProducto: true
      },
      orderBy: [
        { paisId: 'asc' },
        { tipoProductoId: 'asc' }
      ]
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un nuevo requisito
 */
const crear = async (data) => {
  try {
    if (!data.docRequeridaVentasId || !data.paisId) {
      throw new ValidationError('Los campos docRequeridaVentasId y paisId son obligatorios.');
    }
    
    // Validar existencia de documento requerido
    const documento = await prisma.docRequeridaVentas.findUnique({ 
      where: { id: data.docRequeridaVentasId } 
    });
    if (!documento) throw new ValidationError('Documento requerido no existente.');
    
    // Validar existencia de país
    const pais = await prisma.pais.findUnique({ where: { id: data.paisId } });
    if (!pais) throw new ValidationError('País no existente.');
    
    // Validar existencia de tipo de producto si se proporciona
    if (data.tipoProductoId) {
      const tipoProducto = await prisma.tipoProducto.findUnique({ 
        where: { id: data.tipoProductoId } 
      });
      if (!tipoProducto) throw new ValidationError('Tipo de producto no existente.');
    }
    
    // Validar unicidad
    await validarUnicidad(
      data.docRequeridaVentasId, 
      data.paisId, 
      data.tipoProductoId || null
    );
    
    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaCreacion: data.fechaCreacion || new Date(),
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };
    
    return await prisma.requisitoDocPorPais.create({ 
      data: datosConAuditoria,
      include: {
        docRequeridaVentas: true,
        pais: true,
        tipoProducto: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un requisito existente
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.requisitoDocPorPais.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Requisito no encontrado');
    
    // Validar existencia de referencias si cambian
    if (data.docRequeridaVentasId && data.docRequeridaVentasId !== existente.docRequeridaVentasId) {
      const documento = await prisma.docRequeridaVentas.findUnique({ 
        where: { id: data.docRequeridaVentasId } 
      });
      if (!documento) throw new ValidationError('Documento requerido no existente.');
    }
    
    if (data.paisId && data.paisId !== existente.paisId) {
      const pais = await prisma.pais.findUnique({ where: { id: data.paisId } });
      if (!pais) throw new ValidationError('País no existente.');
    }
    
    if (data.tipoProductoId && data.tipoProductoId !== existente.tipoProductoId) {
      const tipoProducto = await prisma.tipoProducto.findUnique({ 
        where: { id: data.tipoProductoId } 
      });
      if (!tipoProducto) throw new ValidationError('Tipo de producto no existente.');
    }
    
    // Validar unicidad si cambian los campos clave
    const cambiaronClavesUnicas = 
      (data.docRequeridaVentasId && data.docRequeridaVentasId !== existente.docRequeridaVentasId) ||
      (data.paisId && data.paisId !== existente.paisId) ||
      (data.tipoProductoId !== undefined && data.tipoProductoId !== existente.tipoProductoId);
      
    if (cambiaronClavesUnicas) {
      await validarUnicidad(
        data.docRequeridaVentasId || existente.docRequeridaVentasId,
        data.paisId || existente.paisId,
        data.tipoProductoId !== undefined ? data.tipoProductoId : existente.tipoProductoId,
        id
      );
    }
    
    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaCreacion: data.fechaCreacion || existente.fechaCreacion || new Date(),
      creadoPor: data.creadoPor || existente.creadoPor || null,
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };
    
    return await prisma.requisitoDocPorPais.update({ 
      where: { id }, 
      data: datosConAuditoria,
      include: {
        docRequeridaVentas: true,
        pais: true,
        tipoProducto: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un requisito
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.requisitoDocPorPais.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Requisito no encontrado');
    
    await prisma.requisitoDocPorPais.delete({ where: { id } });
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
  obtenerPorPais,
  obtenerPorDocumento,
  crear,
  actualizar,
  eliminar
};