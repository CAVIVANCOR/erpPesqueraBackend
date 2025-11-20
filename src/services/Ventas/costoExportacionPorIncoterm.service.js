import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para CostoExportacionPorIncoterm
 * Gestiona la configuración de costos aplicables por Incoterm
 * Define qué costos aplican para cada Incoterm y quién es responsable
 * Incluye validaciones de relaciones y campos de auditoría.
 * Documentado en español.
 */

/**
 * Valida que no exista un costo duplicado para el mismo Incoterm y Producto
 */
async function validarUnicidad(incotermId, productoId, id = null) {
  const where = {
    incotermId,
    productoId,
    ...(id ? { NOT: { id } } : {})
  };
  
  const existe = await prisma.costoExportacionPorIncoterm.findFirst({ where });
  if (existe) {
    throw new ConflictError('Ya existe este costo configurado para el Incoterm seleccionado.');
  }
}

/**
 * Lista todos los costos por Incoterm con sus relaciones
 */
const listar = async () => {
  try {
    return await prisma.costoExportacionPorIncoterm.findMany({
      include: {
        incoterm: true,
        producto: {
          include: {
            familia: true,
            subfamilia: true
          }
        },
        proveedorDefault: true,
        monedaDefault: true,
        documentoAsociado: true
      },
      orderBy: [
        { incotermId: 'asc' },
        { orden: 'asc' }
      ]
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un costo por ID
 */
const obtenerPorId = async (id) => {
  try {
    const costo = await prisma.costoExportacionPorIncoterm.findUnique({
      where: { id },
      include: {
        incoterm: true,
        producto: {
          include: {
            familia: true,
            subfamilia: true
          }
        },
        proveedorDefault: true,
        monedaDefault: true,
        documentoAsociado: true
      }
    });
    if (!costo) throw new NotFoundError('Costo de exportación no encontrado');
    return costo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene costos por Incoterm
 */
const obtenerPorIncoterm = async (incotermId) => {
  try {
    return await prisma.costoExportacionPorIncoterm.findMany({
      where: { 
        incotermId,
        activo: true
      },
      include: {
        producto: {
          include: {
            familia: true,
            subfamilia: true
          }
        },
        proveedorDefault: true,
        monedaDefault: true,
        documentoAsociado: true
      },
      orderBy: { orden: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene costos activos por Incoterm (solo responsabilidad del vendedor)
 */
const obtenerCostosVendedorPorIncoterm = async (incotermId) => {
  try {
    return await prisma.costoExportacionPorIncoterm.findMany({
      where: { 
        incotermId,
        activo: true,
        esResponsabilidadVendedor: true
      },
      include: {
        producto: {
          include: {
            familia: true,
            subfamilia: true
          }
        },
        proveedorDefault: true,
        monedaDefault: true,
        documentoAsociado: true
      },
      orderBy: { orden: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un nuevo costo por Incoterm
 */
const crear = async (data, usuarioId) => {
  try {
    if (!data.incotermId || !data.productoId) {
      throw new ValidationError('Los campos incotermId y productoId son obligatorios.');
    }
    
    // Validar existencia de Incoterm
    const incoterm = await prisma.incoterm.findUnique({ 
      where: { id: data.incotermId } 
    });
    if (!incoterm) throw new ValidationError('Incoterm no existente.');
    
    // Validar existencia de Producto
    const producto = await prisma.producto.findUnique({ 
      where: { id: data.productoId },
      include: { familia: true }
    });
    if (!producto) throw new ValidationError('Producto no existente.');
    
    // Validar que el producto sea de la familia "Gastos Exportación" (familiaId = 7)
    if (producto.familiaId !== 7) {
      throw new ValidationError('El producto debe pertenecer a la familia "Gastos Exportación" (ID: 7).');
    }
    
    // Validar unicidad
    await validarUnicidad(data.incotermId, data.productoId);
    
    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      creadoPor: usuarioId || null,
      actualizadoPor: usuarioId || null,
    };
    
    return await prisma.costoExportacionPorIncoterm.create({ 
      data: datosConAuditoria,
      include: {
        incoterm: true,
        producto: {
          include: {
            familia: true,
            subfamilia: true
          }
        },
        proveedorDefault: true,
        monedaDefault: true,
        documentoAsociado: true
      }
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un costo por Incoterm existente
 */
const actualizar = async (id, data, usuarioId) => {
  try {
    const existente = await prisma.costoExportacionPorIncoterm.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Costo de exportación no encontrado');
    
    // Validar existencia de referencias si cambian
    if (data.incotermId && data.incotermId !== existente.incotermId) {
      const incoterm = await prisma.incoterm.findUnique({ 
        where: { id: data.incotermId } 
      });
      if (!incoterm) throw new ValidationError('Incoterm no existente.');
    }
    
    if (data.productoId && data.productoId !== existente.productoId) {
      const producto = await prisma.producto.findUnique({ 
        where: { id: data.productoId },
        include: { familia: true }
      });
      if (!producto) throw new ValidationError('Producto no existente.');
      
      // Validar familia
      if (producto.familiaId !== 7) {
        throw new ValidationError('El producto debe pertenecer a la familia "Gastos Exportación" (ID: 7).');
      }
    }
    
    // Validar unicidad si cambian los campos clave
    const cambiaronClavesUnicas = 
      (data.incotermId && data.incotermId !== existente.incotermId) ||
      (data.productoId && data.productoId !== existente.productoId);
      
    if (cambiaronClavesUnicas) {
      await validarUnicidad(
        data.incotermId || existente.incotermId,
        data.productoId || existente.productoId,
        id
      );
    }
    
    // Asegurar campos de auditoría
    const datosConAuditoria = {
      ...data,
      fechaActualizacion: new Date(),
      actualizadoPor: usuarioId || null,
    };
    
    // Si no existe creadoPor, establecerlo con el usuario actual
    if (!existente.creadoPor && usuarioId) {
      datosConAuditoria.creadoPor = usuarioId;
    }
    
    return await prisma.costoExportacionPorIncoterm.update({ 
      where: { id }, 
      data: datosConAuditoria,
      include: {
        incoterm: true,
        producto: {
          include: {
            familia: true,
            subfamilia: true
          }
        },
        proveedorDefault: true,
        monedaDefault: true,
        documentoAsociado: true
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un costo por Incoterm
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.costoExportacionPorIncoterm.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Costo de exportación no encontrado');
    
    await prisma.costoExportacionPorIncoterm.delete({ where: { id } });
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
  obtenerPorIncoterm,
  obtenerCostosVendedorPorIncoterm,
  crear,
  actualizar,
  eliminar
};