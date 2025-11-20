import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para PrecioEntidad
 * Aplica validaciones de referencias y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida existencia de entidadComercialId, productoId y monedaId.
 * Lanza ValidationError según corresponda.
 * @param {Object} data - Datos del precio
 */
async function validarPrecioEntidad(data) {
  // Validar existencia de EntidadComercial
  if (data.entidadComercialId) {
    const existe = await prisma.entidadComercial.findUnique({ where: { id: data.entidadComercialId } });
    if (!existe) throw new ValidationError('Entidad comercial no existente.');
  }
  // Validar existencia de Producto
  if (data.productoId) {
    const existeProducto = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!existeProducto) throw new ValidationError('Producto no existente.');
  }
  // Validar existencia de Moneda
  if (data.monedaId) {
    const existeMoneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!existeMoneda) throw new ValidationError('Moneda no existente.');
  }
}

/**
 * Lista todos los precios de entidad.
 */
const listar = async () => {
  try {
    return await prisma.precioEntidad.findMany({
      include: {
        entidadComercial: true,
        producto: {
          include: {
            unidadMedida: true
          }
        },
        moneda: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un precio por ID (incluyendo entidad comercial, producto y moneda asociadas).
 */
const obtenerPorId = async (id) => {
  try {
    const precio = await prisma.precioEntidad.findUnique({
      where: { id },
      include: {
        entidadComercial: true,
        producto: {
          include: {
            unidadMedida: true
          }
        },
        moneda: true
      }
    });
    if (!precio) throw new NotFoundError('Precio no encontrado');
    return precio;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene todos los precios de una entidad comercial específica.
 */
const obtenerPorEntidad = async (entidadComercialId) => {
  try {
    const resultado = await prisma.precioEntidad.findMany({
      where: { entidadComercialId },
      include: {
        entidadComercial: true,
        producto: {
          include: {
            unidadMedida: true
          }
        },
        moneda: true,
      },
      orderBy: { id: 'desc' }
    });
    
    // Consultar manualmente los datos de personal para cada precio
    const resultadoConPersonal = await Promise.all(
      resultado.map(async (precio) => {
        let personalCreador = null;
        let personalActualizador = null;
        
        // Consultar personal creador si existe
        if (precio.creadoPor) {
          personalCreador = await prisma.personal.findUnique({
            where: { id: precio.creadoPor },
            select: { id: true, nombres: true, apellidos: true }
          });
        }
        
        // Consultar personal actualizador si existe
        if (precio.actualizadoPor) {
          personalActualizador = await prisma.personal.findUnique({
            where: { id: precio.actualizadoPor },
            select: { id: true, nombres: true, apellidos: true }
          });
        }
        
        return {
          ...precio,
          personalCreador,
          personalActualizador
        };
      })
    );
    
    return resultadoConPersonal;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un precio validando referencias.
 */
const crear = async (data) => {
  try {
    await validarPrecioEntidad(data);
    
    // Asegurar que las fechas de auditoría estén presentes
    const datosConAuditoria = {
      ...data,
      fechaCreacion: data.fechaCreacion || new Date(),
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };
    
    return await prisma.precioEntidad.create({ data: datosConAuditoria });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un precio existente, validando existencia y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.precioEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Precio no encontrado');
    await validarPrecioEntidad(data);
    
    // Asegurar que todos los campos de auditoría estén presentes
    const datosConAuditoria = {
      ...data,
      // Si fechaCreacion o creadoPor son null/vacíos en el registro existente, asignarlos ahora
      fechaCreacion: data.fechaCreacion || existente.fechaCreacion || new Date(),
      creadoPor: data.creadoPor || existente.creadoPor || null,
      // Siempre actualizar estos campos
      fechaActualizacion: data.fechaActualizacion || new Date(),
    };
    
    return await prisma.precioEntidad.update({ where: { id }, data: datosConAuditoria });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un precio por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.precioEntidad.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Precio no encontrado');
    await prisma.precioEntidad.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene el precio especial activo vigente para un cliente-producto específico.
 * Busca el precio activo cuya fecha de vigencia incluya la fecha actual.
 * @param {BigInt} entidadComercialId - ID del cliente
 * @param {BigInt} productoId - ID del producto
 * @returns {Promise<Object|null>} - Precio especial vigente o null si no existe
 */
const obtenerPrecioEspecialActivo = async (entidadComercialId, productoId) => {
  try {
    const fechaActual = new Date();
    
    const precio = await prisma.precioEntidad.findFirst({
      where: {
        entidadComercialId: BigInt(entidadComercialId),
        productoId: BigInt(productoId),
        activo: true,
        vigenteDesde: {
          lte: fechaActual  // Vigente desde <= fecha actual
        },
        OR: [
          { vigenteHasta: null },  // Sin fecha de fin (vigencia indefinida)
          { vigenteHasta: { gte: fechaActual } }  // Vigente hasta >= fecha actual
        ]
      },
      include: {
        entidadComercial: true,
        producto: {
          include: {
            unidadMedida: true
          }
        },
        moneda: true
      },
      orderBy: {
        vigenteDesde: 'desc'  // El más reciente si hay varios
      }
    });
    
    return precio;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerPorEntidad,
  obtenerPrecioEspecialActivo,
  crear,
  actualizar,
  eliminar
};
