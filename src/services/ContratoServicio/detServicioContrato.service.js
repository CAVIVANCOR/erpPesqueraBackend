import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetServicioContrato
 * Gestiona detalles de servicios en contratos de servicio
 * Documentado en español.
 */

/**
 * Valida claves foráneas
 */
const validarClavesForaneas = async (data) => {
  const contratoServicio = await prisma.contratoServicio.findUnique({ where: { id: data.contratoServicioId } });
  if (!contratoServicio) throw new NotFoundError('ContratoServicio no encontrado');
  
  const productoServicio = await prisma.producto.findUnique({ where: { id: data.productoServicioId } });
  if (!productoServicio) throw new NotFoundError('Producto/Servicio no encontrado');
};

/**
 * Lista todos los detalles de servicios con relaciones
 */
const listar = async () => {
  try {
    return await prisma.detServicioContrato.findMany({
      include: {
        contratoServicio: {
          include: {
            cliente: true,
            empresa: true,
            moneda: true
          }
        },
        productoServicio: {
          include: {
            familia: true,
            subfamilia: true,
            unidadMedida: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un detalle por ID
 */
const obtenerPorId = async (id) => {
  try {
    const det = await prisma.detServicioContrato.findUnique({ 
      where: { id },
      include: {
        contratoServicio: {
          include: {
            cliente: true,
            empresa: true,
            moneda: true
          }
        },
        productoServicio: {
          include: {
            familia: true,
            subfamilia: true,
            unidadMedida: true
          }
        }
      }
    });
    if (!det) throw new NotFoundError('DetServicioContrato no encontrado');
    return det;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene detalles por contrato
 */
const obtenerPorContrato = async (contratoServicioId) => {
  try {
    return await prisma.detServicioContrato.findMany({
      where: { contratoServicioId },
      include: {
        productoServicio: {
          include: {
            familia: true,
            subfamilia: true,
            unidadMedida: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un nuevo detalle de servicio
 */
const crear = async (data) => {
  try {
    // Validar campos obligatorios según schema
    if (!data.contratoServicioId || !data.productoServicioId || !data.cantidad || !data.valorVentaUnitario) {
      throw new ValidationError(
        'Los campos obligatorios no pueden estar vacíos: contratoServicioId, productoServicioId, cantidad, valorVentaUnitario'
      );
    }
    
    await validarClavesForaneas(data);
    
    // Preparar datos según schema
    const datosConAuditoria = {
      contratoServicioId: BigInt(data.contratoServicioId),
      productoServicioId: BigInt(data.productoServicioId),
      cantidad: Number(data.cantidad),
      valorVentaUnitario: Number(data.valorVentaUnitario),
      incluyeLuz: Boolean(data.incluyeLuz || false),
      creadoPor: data.creadoPor ? BigInt(data.creadoPor) : null,
      creadoEn: new Date(),
      actualizadoEn: new Date()
    };
    
    return await prisma.detServicioContrato.create({ 
      data: datosConAuditoria,
      include: {
        contratoServicio: {
          include: {
            cliente: true,
            empresa: true,
            moneda: true
          }
        },
        productoServicio: {
          include: {
            familia: true,
            subfamilia: true,
            unidadMedida: true
          }
        }
      }
    });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un detalle existente
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detServicioContrato.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetServicioContrato no encontrado');
    
    const claves = ['contratoServicioId', 'productoServicioId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas(data);
    }
    
    // Preparar datos según schema
    const datosConAuditoria = {
      cantidad: data.cantidad !== undefined ? Number(data.cantidad) : undefined,
      valorVentaUnitario: data.valorVentaUnitario !== undefined ? Number(data.valorVentaUnitario) : undefined,
      incluyeLuz: data.incluyeLuz !== undefined ? Boolean(data.incluyeLuz) : undefined,
      actualizadoPor: data.actualizadoPor ? BigInt(data.actualizadoPor) : null,
      actualizadoEn: new Date()
    };
    
    // Remover campos undefined
    Object.keys(datosConAuditoria).forEach(key => 
      datosConAuditoria[key] === undefined && delete datosConAuditoria[key]
    );
    
    return await prisma.detServicioContrato.update({ 
      where: { id }, 
      data: datosConAuditoria,
      include: {
        contratoServicio: {
          include: {
            cliente: true,
            empresa: true,
            moneda: true
          }
        },
        productoServicio: {
          include: {
            familia: true,
            subfamilia: true,
            unidadMedida: true
          }
        }
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un detalle
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detServicioContrato.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('DetServicioContrato no encontrado');
    await prisma.detServicioContrato.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Calcula totales de un contrato
 */
const calcularTotalContrato = async (contratoServicioId) => {
  try {
    const detalles = await prisma.detServicioContrato.findMany({
      where: { contratoServicioId }
    });
    
    const total = detalles.reduce((sum, det) => {
      return sum + (Number(det.cantidad) * Number(det.valorVentaUnitario));
    }, 0);
    
    return {
      cantidadDetalles: detalles.length,
      totalContrato: total
    };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  obtenerPorContrato,
  crear,
  actualizar,
  eliminar,
  calcularTotalContrato
};