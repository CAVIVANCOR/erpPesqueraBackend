import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio CRUD para DetGastosPlanificados
 * Maneja gastos planificados para diferentes tipos de entregas a rendir.
 * Documentado en español.
 */

/**
 * Valida que solo un campo FK tenga valor y que las referencias existan.
 * @param {Object} data - Datos del gasto planificado
 */
async function validarDetGastosPlanificados(data) {
  // Validar que solo UNO de los campos FK tenga valor
  const fkFields = [
    'detMovEntregaRendirTemporadaPescaId',
    'detMovEntRendirPescaConsumoId',
    'detMovEntregaRendirPComprasId',
    'detMovEntregaRendirPVentasId',
    'detMovEntregaRendirMovAlmacenId',
    'detMovEntregaRendirContratoId',
    'detMovEntregaRendirOTId'
  ];

  const fkValuesPresent = fkFields.filter(field => data[field] !== undefined && data[field] !== null);
  
  if (fkValuesPresent.length === 0) {
    throw new ValidationError('Debe especificar al menos un tipo de entrega a rendir.');
  }
  
  if (fkValuesPresent.length > 1) {
    throw new ValidationError('Solo puede especificar un tipo de entrega a rendir.');
  }

  // Validar existencia de Producto (gasto)
  if (data.productoId) {
    const producto = await prisma.producto.findUnique({ where: { id: data.productoId } });
    if (!producto) throw new ValidationError('Producto (gasto) no existente.');
  }

  // Validar existencia de Moneda
  if (data.monedaId) {
    const moneda = await prisma.moneda.findUnique({ where: { id: data.monedaId } });
    if (!moneda) throw new ValidationError('Moneda no existente.');
  }

  // Validar existencia de la entrega a rendir correspondiente
  if (data.detMovEntregaRendirTemporadaPescaId) {
    const existe = await prisma.detMovsEntregaRendir.findUnique({ 
      where: { id: data.detMovEntregaRendirTemporadaPescaId } 
    });
    if (!existe) throw new ValidationError('Detalle de movimiento de entrega a rendir (Temporada Pesca) no existente.');
  }

  if (data.detMovEntRendirPescaConsumoId) {
    const existe = await prisma.detMovsEntRendirPescaConsumo.findUnique({ 
      where: { id: data.detMovEntRendirPescaConsumoId } 
    });
    if (!existe) throw new ValidationError('Detalle de movimiento de entrega a rendir (Pesca Consumo) no existente.');
  }

  if (data.detMovEntregaRendirPComprasId) {
    const existe = await prisma.detMovsEntregaRendirPCompras.findUnique({ 
      where: { id: data.detMovEntregaRendirPComprasId } 
    });
    if (!existe) throw new ValidationError('Detalle de movimiento de entrega a rendir (Compras) no existente.');
  }

  if (data.detMovEntregaRendirPVentasId) {
    const existe = await prisma.detMovsEntregaRendirPVentas.findUnique({ 
      where: { id: data.detMovEntregaRendirPVentasId } 
    });
    if (!existe) throw new ValidationError('Detalle de movimiento de entrega a rendir (Ventas) no existente.');
  }

  if (data.detMovEntregaRendirMovAlmacenId) {
    const existe = await prisma.detMovsEntregaRendirMovAlmacen.findUnique({ 
      where: { id: data.detMovEntregaRendirMovAlmacenId } 
    });
    if (!existe) throw new ValidationError('Detalle de movimiento de entrega a rendir (Movimiento Almacén) no existente.');
  }

  if (data.detMovEntregaRendirContratoId) {
    const existe = await prisma.detMovsEntregaRendirContratoServicios.findUnique({ 
      where: { id: data.detMovEntregaRendirContratoId } 
    });
    if (!existe) throw new ValidationError('Detalle de movimiento de entrega a rendir (Contrato Servicios) no existente.');
  }

  if (data.detMovEntregaRendirOTId) {
    const existe = await prisma.detMovsEntregaRendirOTMantenimiento.findUnique({ 
      where: { id: data.detMovEntregaRendirOTId } 
    });
    if (!existe) throw new ValidationError('Detalle de movimiento de entrega a rendir (OT Mantenimiento) no existente.');
  }
}

/**
 * Lista todos los gastos planificados con filtros opcionales.
 * @param {Object} filtros - Filtros opcionales
 */
const listar = async (filtros = {}) => {
  try {
    const where = {};
    
    // Filtrar por tipo de entrega a rendir
    if (filtros.detMovEntregaRendirTemporadaPescaId) {
      where.detMovEntregaRendirTemporadaPescaId = filtros.detMovEntregaRendirTemporadaPescaId;
    }
    if (filtros.detMovEntRendirPescaConsumoId) {
      where.detMovEntRendirPescaConsumoId = filtros.detMovEntRendirPescaConsumoId;
    }
    if (filtros.detMovEntregaRendirPComprasId) {
      where.detMovEntregaRendirPComprasId = filtros.detMovEntregaRendirPComprasId;
    }
    if (filtros.detMovEntregaRendirPVentasId) {
      where.detMovEntregaRendirPVentasId = filtros.detMovEntregaRendirPVentasId;
    }
    if (filtros.detMovEntregaRendirMovAlmacenId) {
      where.detMovEntregaRendirMovAlmacenId = filtros.detMovEntregaRendirMovAlmacenId;
    }
    if (filtros.detMovEntregaRendirContratoId) {
      where.detMovEntregaRendirContratoId = filtros.detMovEntregaRendirContratoId;
    }
    if (filtros.detMovEntregaRendirOTId) {
      where.detMovEntregaRendirOTId = filtros.detMovEntregaRendirOTId;
    }
    
    const gastos = await prisma.detGastosPlanificados.findMany({
      where,
      include: {
        producto: {
          select: {
            id: true,
            descripcionArmada: true
          }
        },
        moneda: {
          select: {
            id: true,
            nombre: true,
            simbolo: true
          }
        }
      },
      orderBy: {
        creadoEn: 'desc'
      }
    });

    return gastos;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un gasto planificado por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const gasto = await prisma.detGastosPlanificados.findUnique({
      where: { id },
      include: {
        producto: {
          select: {
            id: true,
            descripcionArmada: true
          }
        },
        moneda: {
          select: {
            id: true,
            nombre: true,
            simbolo: true
          }
        }
      }
    });
    if (!gasto) throw new NotFoundError('Gasto planificado no encontrado');
    return gasto;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un registro de gasto planificado validando referencias.
 */
const crear = async (data) => {
  try {
    await validarDetGastosPlanificados(data);
    return await prisma.detGastosPlanificados.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un registro de gasto planificado existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.detGastosPlanificados.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Gasto planificado no encontrado');
    await validarDetGastosPlanificados(data);
    return await prisma.detGastosPlanificados.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un registro de gasto planificado por ID.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.detGastosPlanificados.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Gasto planificado no encontrado');
    await prisma.detGastosPlanificados.delete({ where: { id } });
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
  crear,
  actualizar,
  eliminar
};
