import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TarifaCostoExportacionRuta
 * Gestiona las tarifas específicas por ruta para costos de exportación
 * Define cuánto cuesta cada servicio según la ruta (origen-destino)
 * Incluye validaciones de relaciones y campos de auditoría.
 * Documentado en español.
 */

/**
 * Lista todas las tarifas por ruta
 */
const listar = async () => {
  try {
    return await prisma.tarifaCostoExportacionRuta.findMany({
      include: {
        costoIncoterm: {
          include: {
            producto: true,
            incoterm: true
          }
        },
        paisOrigen: true,
        puertoOrigen: true,
        paisDestino: true,
        puertoDestino: true,
        proveedor: true,
        moneda: true
      },
      orderBy: {
        fechaCreacion: 'desc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene una tarifa por ID
 */
const obtenerPorId = async (id) => {
  try {
    const tarifa = await prisma.tarifaCostoExportacionRuta.findUnique({
      where: { id },
      include: {
        costoIncoterm: {
          include: {
            producto: true,
            incoterm: true
          }
        },
        paisOrigen: true,
        puertoOrigen: true,
        paisDestino: true,
        puertoDestino: true,
        proveedor: true,
        moneda: true
      }
    });
    if (!tarifa) throw new NotFoundError('Tarifa por ruta no encontrada');
    return tarifa;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene tarifas por costo de Incoterm
 */
const obtenerPorCostoIncoterm = async (costoIncotermId) => {
  try {
    return await prisma.tarifaCostoExportacionRuta.findMany({
      where: { 
        costoIncotermId,
        activo: true
      },
      include: {
        paisOrigen: true,
        puertoOrigen: true,
        paisDestino: true,
        puertoDestino: true,
        proveedor: true,
        moneda: true
      },
      orderBy: {
        fechaVigenciaDesde: 'desc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene tarifas vigentes por ruta específica
 */
const obtenerPorRuta = async (costoIncotermId, puertoOrigenId, puertoDestinoId) => {
  try {
    const fechaActual = new Date();
    
    return await prisma.tarifaCostoExportacionRuta.findMany({
      where: {
        costoIncotermId,
        puertoOrigenId,
        puertoDestinoId,
        activo: true,
        fechaVigenciaDesde: {
          lte: fechaActual
        },
        OR: [
          { fechaVigenciaHasta: null },
          { fechaVigenciaHasta: { gte: fechaActual } }
        ]
      },
      include: {
        paisOrigen: true,
        puertoOrigen: true,
        paisDestino: true,
        puertoDestino: true,
        proveedor: true,
        moneda: true
      },
      orderBy: {
        fechaVigenciaDesde: 'desc'
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea una nueva tarifa por ruta
 */
const crear = async (data, usuarioId) => {
  try {
    if (!data.costoIncotermId || !data.monedaId || data.valorVenta === undefined) {
      throw new ValidationError('Los campos costoIncotermId, monedaId y valorVenta son obligatorios.');
    }
    
    // Validar existencia de CostoExportacionPorIncoterm
    const costoIncoterm = await prisma.costoExportacionPorIncoterm.findUnique({ 
      where: { id: data.costoIncotermId } 
    });
    if (!costoIncoterm) throw new ValidationError('Costo de Incoterm no existente.');
    
    // Validar que el costo tenga variaSegunRuta = true
    if (!costoIncoterm.variaSegunRuta) {
      throw new ValidationError('El costo de Incoterm debe tener habilitada la opción "Varía según ruta".');
    }
    
    // Validar existencia de Moneda
    const moneda = await prisma.moneda.findUnique({ 
      where: { id: data.monedaId } 
    });
    if (!moneda) throw new ValidationError('Moneda no existente.');
    
    // Objeto para edición (con validaciones)
    const datosParaEdicion = {
      costoIncotermId: data.costoIncotermId,
      paisOrigenId: data.paisOrigenId,
      puertoOrigenId: data.puertoOrigenId,
      paisDestinoId: data.paisDestinoId,
      puertoDestinoId: data.puertoDestinoId,
      proveedorId: data.proveedorId,
      monedaId: data.monedaId,
      valorVenta: data.valorVenta,
      fechaVigenciaDesde: data.fechaVigenciaDesde,
      fechaVigenciaHasta: data.fechaVigenciaHasta,
      activo: data.activo !== undefined ? data.activo : true,
      observaciones: data.observaciones,
    };
    
    // Objeto para grabación (sin relaciones)
    const datosParaGrabacion = {
      costoIncotermId: data.costoIncotermId,
      paisOrigenId: data.paisOrigenId,
      puertoOrigenId: data.puertoOrigenId,
      paisDestinoId: data.paisDestinoId,
      puertoDestinoId: data.puertoDestinoId,
      proveedorId: data.proveedorId,
      monedaId: data.monedaId,
      valorVenta: data.valorVenta,
      fechaVigenciaDesde: data.fechaVigenciaDesde || new Date(),
      fechaVigenciaHasta: data.fechaVigenciaHasta,
      activo: data.activo !== undefined ? data.activo : true,
      observaciones: data.observaciones,
      fechaCreacion: new Date(),
      fechaActualizacion: new Date(),
      creadoPor: usuarioId || null,
      actualizadoPor: usuarioId || null,
    };
    
    return await prisma.tarifaCostoExportacionRuta.create({ 
      data: datosParaGrabacion,
      include: {
        costoIncoterm: {
          include: {
            producto: true,
            incoterm: true
          }
        },
        paisOrigen: true,
        puertoOrigen: true,
        paisDestino: true,
        puertoDestino: true,
        proveedor: true,
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
 * Actualiza una tarifa por ruta existente
 */
const actualizar = async (id, data, usuarioId) => {
  try {
    const existente = await prisma.tarifaCostoExportacionRuta.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tarifa por ruta no encontrada');
    
    // Validar existencia de referencias si cambian
    if (data.costoIncotermId && data.costoIncotermId !== existente.costoIncotermId) {
      const costoIncoterm = await prisma.costoExportacionPorIncoterm.findUnique({ 
        where: { id: data.costoIncotermId } 
      });
      if (!costoIncoterm) throw new ValidationError('Costo de Incoterm no existente.');
      
      if (!costoIncoterm.variaSegunRuta) {
        throw new ValidationError('El costo de Incoterm debe tener habilitada la opción "Varía según ruta".');
      }
    }
    
    if (data.monedaId && data.monedaId !== existente.monedaId) {
      const moneda = await prisma.moneda.findUnique({ 
        where: { id: data.monedaId } 
      });
      if (!moneda) throw new ValidationError('Moneda no existente.');
    }
    
    // Objeto para edición (con validaciones)
    const datosParaEdicion = {
      costoIncotermId: data.costoIncotermId,
      paisOrigenId: data.paisOrigenId,
      puertoOrigenId: data.puertoOrigenId,
      paisDestinoId: data.paisDestinoId,
      puertoDestinoId: data.puertoDestinoId,
      proveedorId: data.proveedorId,
      monedaId: data.monedaId,
      valorVenta: data.valorVenta,
      fechaVigenciaDesde: data.fechaVigenciaDesde,
      fechaVigenciaHasta: data.fechaVigenciaHasta,
      activo: data.activo,
      observaciones: data.observaciones,
    };
    
    // Objeto para grabación (sin relaciones)
    const datosParaGrabacion = {
      costoIncotermId: data.costoIncotermId,
      paisOrigenId: data.paisOrigenId,
      puertoOrigenId: data.puertoOrigenId,
      paisDestinoId: data.paisDestinoId,
      puertoDestinoId: data.puertoDestinoId,
      proveedorId: data.proveedorId,
      monedaId: data.monedaId,
      valorVenta: data.valorVenta,
      fechaVigenciaDesde: data.fechaVigenciaDesde,
      fechaVigenciaHasta: data.fechaVigenciaHasta,
      activo: data.activo,
      observaciones: data.observaciones,
      fechaActualizacion: new Date(),
      actualizadoPor: usuarioId || null,
    };
    
    // Si no existe creadoPor, establecerlo con el usuario actual
    if (!existente.creadoPor && usuarioId) {
      datosParaGrabacion.creadoPor = usuarioId;
    }
    
    return await prisma.tarifaCostoExportacionRuta.update({ 
      where: { id }, 
      data: datosParaGrabacion,
      include: {
        costoIncoterm: {
          include: {
            producto: true,
            incoterm: true
          }
        },
        paisOrigen: true,
        puertoOrigen: true,
        paisDestino: true,
        puertoDestino: true,
        proveedor: true,
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
 * Elimina una tarifa por ruta
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tarifaCostoExportacionRuta.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tarifa por ruta no encontrada');
    
    await prisma.tarifaCostoExportacionRuta.delete({ where: { id } });
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
  obtenerPorCostoIncoterm,
  obtenerPorRuta,
  crear,
  actualizar,
  eliminar
};