import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetServicioContrato
 * Gestiona detalles de servicios en contratos de servicio
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [contrato, producto] = await Promise.all([
    prisma.contratoServicio.findUnique({ where: { id: data.contratoServicioId } }),
    prisma.producto.findUnique({ where: { id: data.productoServicioId } })
  ]);
  
  if (!contrato) throw new ValidationError('El contratoServicioId no existe.');
  if (!producto) throw new ValidationError('El productoServicioId no existe.');
}

/**
 * Lista todos los detalles de servicios
 */
const listar = async () => {
  try {
    return await prisma.detServicioContrato.findMany({
      include: {
        contratoServicio: {
          include: {
            cliente: true,
            empresa: true
          }
        },
        productoServicio: {
          include: {
            familia: true,
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
    // Validar campos obligatorios
    if (!data.contratoServicioId || !data.productoServicioId || !data.cantidad || !data.precioUnitario) {
      throw new ValidationError(
        'Los campos obligatorios no pueden estar vacíos: contratoServicioId, productoServicioId, cantidad, precioUnitario'
      );
    }
    
    await validarClavesForaneas(data);
    
    // Calcular valores automáticamente
    const cantidad = Number(data.cantidad) || 0;
    const precioUnitario = Number(data.precioUnitario) || 0;
    const valorTotal = cantidad * precioUnitario;
    
    // Para servicios de luz
    const cantidadKwh = Number(data.cantidadKwh) || 0;
    const precioKwh = Number(data.precioKwh) || 0;
    const recargoKwh = Number(data.recargoKwh) || 0;
    const precioKwhConRecargo = precioKwh + recargoKwh;
    const valorTotalLuz = cantidadKwh * precioKwhConRecargo;
    
    const datosConAuditoria = {
      ...data,
      cantidad,
      precioUnitario,
      valorTotal,
      cantidadKwh,
      precioKwh,
      recargoKwh,
      precioKwhConRecargo,
      valorTotalLuz,
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
            unidadMedida: true
          }
        }
      }
    });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
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
      await validarClavesForaneas({ ...existente, ...data });
    }
    
    // Recalcular valores si cambian los campos relevantes
    const cantidad = data.cantidad !== undefined ? Number(data.cantidad) : Number(existente.cantidad);
    const precioUnitario = data.precioUnitario !== undefined ? Number(data.precioUnitario) : Number(existente.precioUnitario);
    const valorTotal = cantidad * precioUnitario;
    
    const cantidadKwh = data.cantidadKwh !== undefined ? Number(data.cantidadKwh) : Number(existente.cantidadKwh);
    const precioKwh = data.precioKwh !== undefined ? Number(data.precioKwh) : Number(existente.precioKwh);
    const recargoKwh = data.recargoKwh !== undefined ? Number(data.recargoKwh) : Number(existente.recargoKwh);
    const precioKwhConRecargo = precioKwh + recargoKwh;
    const valorTotalLuz = cantidadKwh * precioKwhConRecargo;
    
    const datosConAuditoria = {
      ...data,
      cantidad,
      precioUnitario,
      valorTotal,
      cantidadKwh,
      precioKwh,
      recargoKwh,
      precioKwhConRecargo,
      valorTotalLuz,
      creadoEn: existente.creadoEn,
      creadoPor: existente.creadoPor,
      actualizadoEn: new Date()
    };
    
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
            unidadMedida: true
          }
        }
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
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
 * Calcula el total del contrato sumando todos sus detalles
 */
const calcularTotalContrato = async (contratoServicioId) => {
  try {
    const detalles = await prisma.detServicioContrato.findMany({
      where: { contratoServicioId }
    });

    const totalServicios = detalles.reduce((sum, det) => {
      return sum + Number(det.valorTotal || 0);
    }, 0);

    const totalLuz = detalles.reduce((sum, det) => {
      return sum + Number(det.valorTotalLuz || 0);
    }, 0);

    const totalGeneral = totalServicios + totalLuz;

    return {
      totalServicios,
      totalLuz,
      totalGeneral,
      cantidadDetalles: detalles.length
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
