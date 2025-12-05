import prisma from '../../config/prismaClient.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';
import { ValidationError } from '../../utils/errors.js';

/**
 * Controlador Profesional para KardexAlmacen
 * 
 * Endpoints para consultar kardex con ordenamiento profesional:
 * - Por producto y almacén
 * - Por rango de fechas
 * - Por cliente (custodia)
 * - Saldos actuales
 * 
 * Documentado en español.
 */

/**
 * Obtiene kardex por producto y almacén con ordenamiento profesional
 * Query params: empresaId, almacenId, productoId, clienteId?, esCustodia?, fechaDesde?, fechaHasta?
 */
export async function obtenerKardexPorProducto(req, res, next) {
  try {
    const { empresaId, almacenId, productoId, clienteId, esCustodia, fechaDesde, fechaHasta } = req.query;

    if (!empresaId || !almacenId || !productoId) {
      throw new ValidationError('empresaId, almacenId y productoId son requeridos');
    }

    // Soporte para múltiples almacenes (separados por coma)
    const almacenIds = almacenId.includes(',') 
      ? almacenId.split(',').map(id => BigInt(id.trim()))
      : [BigInt(almacenId)];

    const where = {
      empresaId: BigInt(empresaId),
      almacenId: almacenIds.length > 1 ? { in: almacenIds } : almacenIds[0],
      productoId: BigInt(productoId),
      esCustodia: esCustodia === 'true'
    };

    // Solo agregar clienteId cuando es custodia
    if (esCustodia === 'true' && clienteId) {
      where.clienteId = BigInt(clienteId);
    }

    // Filtro por rango de fechas
    if (fechaDesde || fechaHasta) {
      where.fechaMovimientoAlmacen = {};
      if (fechaDesde) where.fechaMovimientoAlmacen.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaMovimientoAlmacen.lte = new Date(fechaHasta);
    }

    // Ordenamiento profesional WMS: almacén primero, luego fecha, tipo, variables de trazabilidad
    const kardex = await prisma.kardexAlmacen.findMany({
      where,
      orderBy: [
        { almacenId: 'asc' },            // 1. Almacén (WMS estándar)
        { fechaMovimientoAlmacen: 'asc' }, // 2. Fecha
        { esIngresoEgreso: 'desc' },     // 3. INGRESOS primero
        { lote: 'asc' },                 // 4. Lote
        { fechaIngreso: 'asc' },         // 5. Fecha ingreso (FIFO)
        { fechaProduccion: 'asc' },      // 6. Fecha producción
        { fechaVencimiento: 'asc' },     // 7. Fecha vencimiento (FEFO)
        { numContenedor: 'asc' },        // 8. Contenedor
        { nroSerie: 'asc' },             // 9. Serie
        { estadoId: 'asc' },             // 10. Estado mercadería
        { estadoCalidadId: 'asc' },      // 11. Estado calidad
        { id: 'asc' }                    // 12. ID
      ],
      include: {
        producto: {
          select: {
            id: true,
            descripcionArmada: true,
            codigo: true
          }
        },
        cliente: {
          select: {
            id: true,
            razonSocial: true
          }
        },
        conceptoMovAlmacen: {
          select: {
            id: true,
            descripcion: true,
            descripcionArmada: true,
            almacenOrigenId: true,
            almacenDestinoId: true
          }
        }
      }
    });

    // Obtener IDs únicos de almacenes desde el kardex
    const almacenIdsUnicos = [...new Set(kardex.map(k => k.almacenId))];
    
    // Buscar descripciones de almacenes
    const almacenes = almacenIdsUnicos.length > 0 ? await prisma.almacen.findMany({
      where: { id: { in: almacenIdsUnicos } },
      select: { id: true, descripcion: true }
    }) : [];

    // Obtener IDs únicos de estados
    const estadoIds = [...new Set(kardex.map(k => k.estadoId).filter(Boolean))];
    const estadoCalidadIds = [...new Set(kardex.map(k => k.estadoCalidadId).filter(Boolean))];

    // Buscar descripciones de estados
    const estados = estadoIds.length > 0 ? await prisma.estadoMultiFuncion.findMany({
      where: { id: { in: estadoIds } },
      select: { id: true, descripcion: true }
    }) : [];

    const estadosCalidad = estadoCalidadIds.length > 0 ? await prisma.estadoMultiFuncion.findMany({
      where: { id: { in: estadoCalidadIds } },
      select: { id: true, descripcion: true }
    }) : [];

    // Crear mapas para búsqueda rápida
    const almacenMap = new Map(almacenes.map(a => [a.id.toString(), a]));
    const estadoMap = new Map(estados.map(e => [e.id.toString(), e]));
    const estadoCalidadMap = new Map(estadosCalidad.map(e => [e.id.toString(), e]));

    // Agregar descripciones al kardex
    const kardexCompleto = kardex.map(k => ({
      ...k,
      almacen: almacenMap.get(k.almacenId.toString()) || null,
      estado: k.estadoId ? estadoMap.get(k.estadoId.toString()) : null,
      estadoCalidad: k.estadoCalidadId ? estadoCalidadMap.get(k.estadoCalidadId.toString()) : null
    }));

    res.json(toJSONBigInt(kardexCompleto));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene kardex por movimiento específico
 */
export async function obtenerKardexPorMovimiento(req, res, next) {
  try {
    const { movimientoId } = req.params;

    if (!movimientoId) {
      throw new ValidationError('movimientoId es requerido');
    }

    const kardex = await prisma.kardexAlmacen.findMany({
      where: {
        movimientoAlmacenId: BigInt(movimientoId)
      },
      orderBy: [
        { fechaMovimientoAlmacen: 'asc' },
        { esIngresoEgreso: 'desc' },
        { id: 'asc' }
      ],
      include: {
        producto: true,
        cliente: true,
        conceptoMovAlmacen: true
      }
    });

    res.json(toJSONBigInt(kardex));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene kardex por cliente (solo custodia)
 */
export async function obtenerKardexPorCliente(req, res, next) {
  try {
    const { empresaId, clienteId, fechaDesde, fechaHasta } = req.query;

    if (!empresaId || !clienteId) {
      throw new ValidationError('empresaId y clienteId son requeridos');
    }

    const where = {
      empresaId: BigInt(empresaId),
      clienteId: BigInt(clienteId),
      esCustodia: true // Solo custodia
    };

    if (fechaDesde || fechaHasta) {
      where.fechaMovimientoAlmacen = {};
      if (fechaDesde) where.fechaMovimientoAlmacen.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaMovimientoAlmacen.lte = new Date(fechaHasta);
    }

    const kardex = await prisma.kardexAlmacen.findMany({
      where,
      orderBy: [
        { fechaMovimientoAlmacen: 'asc' },
        { esIngresoEgreso: 'desc' },
        { id: 'asc' }
      ],
      include: {
        producto: true,
        cliente: true,
        conceptoMovAlmacen: true
      }
    });

    res.json(toJSONBigInt(kardex));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene saldos actuales detallados por producto
 */
export async function obtenerSaldosDetallados(req, res, next) {
  try {
    const { empresaId, almacenId, productoId, clienteId, esCustodia } = req.query;

    if (!empresaId || !almacenId || !productoId) {
      throw new ValidationError('empresaId, almacenId y productoId son requeridos');
    }

    const where = {
      empresaId: BigInt(empresaId),
      almacenId: BigInt(almacenId),
      productoId: BigInt(productoId),
      esCustodia: esCustodia === 'true',
      saldoCantidad: { gt: 0 } // Solo saldos positivos
    };

    // Solo agregar clienteId si es custodia
    if (esCustodia === 'true' && clienteId) {
      where.clienteId = BigInt(clienteId);
    } else if (esCustodia !== 'true') {
      where.clienteId = null; // Mercadería propia
    }

    const saldos = await prisma.saldosDetProductoCliente.findMany({
      where,
      orderBy: [
        { fechaVencimiento: 'asc' }, // FEFO: Primero los que vencen antes
        { fechaIngreso: 'asc' },     // FIFO: Primero los más antiguos
        { lote: 'asc' }
      ],
      include: {
        producto: {
          select: {
            id: true,
            descripcionArmada: true,
            codigo: true
          }
        },
        cliente: {
          select: {
            id: true,
            razonSocial: true
          }
        }
      }
    });

    res.json(toJSONBigInt(saldos));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene saldos generales por producto
 */
export async function obtenerSaldosGenerales(req, res, next) {
  try {
    const { empresaId, almacenId, productoId, clienteId, custodia } = req.query;

    if (!empresaId || !almacenId) {
      throw new ValidationError('empresaId y almacenId son requeridos');
    }

    const where = {
      empresaId: BigInt(empresaId),
      almacenId: BigInt(almacenId),
      saldoCantidad: { gt: 0 } // Solo saldos positivos
    };

    if (productoId) {
      where.productoId = BigInt(productoId);
    }

    if (custodia !== undefined) {
      where.custodia = custodia === 'true';
      
      // Solo agregar clienteId si es custodia
      if (custodia === 'true' && clienteId) {
        where.clienteId = BigInt(clienteId);
      } else if (custodia !== 'true') {
        where.clienteId = null; // Mercadería propia
      }
    }

    const saldos = await prisma.saldosProductoCliente.findMany({
      where,
      orderBy: [
        { productoId: 'asc' }
      ],
      include: {
        producto: {
          select: {
            id: true,
            descripcionArmada: true,
            codigo: true
          }
        },
        cliente: {
          select: {
            id: true,
            razonSocial: true
          }
        }
      }
    });

    res.json(toJSONBigInt(saldos));
  } catch (err) {
    next(err);
  }
}

/**
 * Obtiene reporte de kardex valorizado por período
 */
export async function obtenerReporteKardex(req, res, next) {
  try {
    const { empresaId, almacenId, productoId, fechaDesde, fechaHasta } = req.query;

    if (!empresaId || !almacenId || !fechaDesde || !fechaHasta) {
      throw new ValidationError('empresaId, almacenId, fechaDesde y fechaHasta son requeridos');
    }

    const where = {
      empresaId: BigInt(empresaId),
      almacenId: BigInt(almacenId),
      fechaMovimientoAlmacen: {
        gte: new Date(fechaDesde),
        lte: new Date(fechaHasta)
      }
    };

    if (productoId) {
      where.productoId = BigInt(productoId);
    }

    const kardex = await prisma.kardexAlmacen.findMany({
      where,
      orderBy: [
        { productoId: 'asc' },
        { fechaMovimientoAlmacen: 'asc' },
        { esIngresoEgreso: 'desc' },
        { id: 'asc' }
      ],
      include: {
        producto: true,
        cliente: true,
        conceptoMovAlmacen: true
      }
    });

    res.json(toJSONBigInt(kardex));
  } catch (err) {
    next(err);
  }
}
