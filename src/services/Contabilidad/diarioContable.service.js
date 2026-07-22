import prisma from '../../config/prismaClient.js';
import { DatabaseError, NotFoundError, ValidationError } from '../../utils/errors.js';

/**
 * Servicio para Diario Contable
 * Consulta y exportación de líneas contables
 */

const listarLineas = async (filtros) => {
  try {
    const where = {};
    const whereAsiento = {};

    // ========================================
    // FILTROS DE ASIENTO
    // ========================================
    if (filtros.empresaId) {
      whereAsiento.empresaId = BigInt(filtros.empresaId);
    }
    if (filtros.periodoContableId) {
      whereAsiento.periodoContableId = BigInt(filtros.periodoContableId);
    }
    if (filtros.fechaDesde || filtros.fechaHasta) {
      whereAsiento.fechaAsiento = {};
      if (filtros.fechaDesde) whereAsiento.fechaAsiento.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) whereAsiento.fechaAsiento.lte = new Date(filtros.fechaHasta);
    }
    if (filtros.numeroAsiento) {
      whereAsiento.numeroAsiento = { contains: filtros.numeroAsiento };
    }
    if (filtros.estadoAsientoId) {
      whereAsiento.estadoId = BigInt(filtros.estadoAsientoId);
    }
    if (filtros.tipoLibro) {
      whereAsiento.tipoLibro = filtros.tipoLibro;
    }
    if (filtros.soloCuadrados) {
      whereAsiento.estaCuadrado = true;
    }
    if (filtros.soloDescuadrados) {
      whereAsiento.estaCuadrado = false;
    }
    if (filtros.soloSaldosIniciales) {
      whereAsiento.esSaldoInicial = true;
    }

    // ========================================
    // FILTROS DE DETALLE
    // ========================================
    
    // Filtro por código de cuenta (startsWith)
    if (filtros.codigoCuentaInicia) {
      where.planCuenta = {
        codigoCuenta: { startsWith: filtros.codigoCuentaInicia }
      };
    }
    
    // Filtro por cuenta específica
    if (filtros.planCuentaId) {
      where.planCuentaId = BigInt(filtros.planCuentaId);
    }
    
    // Filtro por entidad comercial
    if (filtros.entidadComercialId) {
      where.entidadComercialId = BigInt(filtros.entidadComercialId);
    }
    if (filtros.soloConEntidad) {
      where.entidadComercialId = { not: null };
    }
    
    // Filtro por centro de costo
    if (filtros.centroCostoId) {
      where.centroCostoId = BigInt(filtros.centroCostoId);
    }
    
    // Filtro por activo
    if (filtros.activoId) {
      where.activoId = BigInt(filtros.activoId);
    }
    
    // Filtro por tipo de documento origen
    if (filtros.tipoDocumentoOrigenId) {
      where.tipoDocumentoOrigenId = BigInt(filtros.tipoDocumentoOrigenId);
    }
    
    // Filtro por número de documento origen
    if (filtros.numeroDocumentoOrigen) {
      where.numeroDocumentoOrigen = { contains: filtros.numeroDocumentoOrigen };
    }
    
    // Filtro por moneda
    if (filtros.monedaId) {
      where.monedaId = BigInt(filtros.monedaId);
    }
    
    // Filtro por submódulo origen
    if (filtros.submoduloOrigenLineaId) {
      where.submoduloOrigenLineaId = BigInt(filtros.submoduloOrigenLineaId);
    }
    
    // Filtro por glosa
    if (filtros.glosa) {
      where.glosa = { contains: filtros.glosa, mode: 'insensitive' };
    }
    
    // Filtro por rango de fecha documento origen
    if (filtros.fechaDocDesde || filtros.fechaDocHasta) {
      where.fechaDocumentoOrigen = {};
      if (filtros.fechaDocDesde) where.fechaDocumentoOrigen.gte = new Date(filtros.fechaDocDesde);
      if (filtros.fechaDocHasta) where.fechaDocumentoOrigen.lte = new Date(filtros.fechaDocHasta);
    }
    
    // Filtro por rango de fecha vencimiento
    if (filtros.fechaVenceDesde || filtros.fechaVenceHasta) {
      where.fechaVenceDocumentoOrigen = {};
      if (filtros.fechaVenceDesde) where.fechaVenceDocumentoOrigen.gte = new Date(filtros.fechaVenceDesde);
      if (filtros.fechaVenceHasta) where.fechaVenceDocumentoOrigen.lte = new Date(filtros.fechaVenceHasta);
    }

    // Aplicar filtros de asiento
    if (Object.keys(whereAsiento).length > 0) {
      where.asientoContable = whereAsiento;
    }

    // ========================================
    // PAGINACIÓN
    // ========================================
    const skip = (filtros.page - 1) * filtros.limit;
    const take = filtros.limit;

    // ========================================
    // CONSULTA
    // ========================================
    const [lineas, total] = await Promise.all([
      prisma.detalleAsientoContable.findMany({
        where,
        include: {
          asientoContable: {
            include: {
              empresa: true,
              periodoContable: true,
              estado: true,
              moneda: true,
            }
          },
          planCuenta: true,
          entidadComercial: true,
          centroCosto: true,
          tipoDocumentoOrigen: true,
          moneda: true,
          activo: true,
          submoduloOrigenLinea: true,
        },
        orderBy: [
          { asientoContable: { fechaAsiento: 'asc' } },
          { asientoContable: { numeroAsiento: 'asc' } },
          { numeroLinea: 'asc' }
        ],
        skip,
        take,
      }),
      prisma.detalleAsientoContable.count({ where })
    ]);

    // ========================================
    // CALCULAR TOTALES
    // ========================================
    const totales = await prisma.detalleAsientoContable.aggregate({
      where,
      _sum: {
        debe: true,
        haber: true,
      }
    });

    return {
      lineas,
      total,
      page: filtros.page,
      limit: filtros.limit,
      totalPages: Math.ceil(total / filtros.limit),
      totales: {
        totalDebe: totales._sum.debe || 0,
        totalHaber: totales._sum.haber || 0,
      }
    };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar líneas', err.message);
    }
    throw err;
  }
};

const generarFormatoSUNAT51 = async (filtros) => {
  try {
    if (!filtros.empresaId || !filtros.periodoContableId) {
      throw new ValidationError('Empresa y Periodo son obligatorios para exportar');
    }

    const lineas = await prisma.detalleAsientoContable.findMany({
      where: {
        asientoContable: {
          empresaId: BigInt(filtros.empresaId),
          periodoContableId: BigInt(filtros.periodoContableId),
          tipoLibro: filtros.tipoLibro || 'FISCAL',
        }
      },
      include: {
        asientoContable: {
          include: {
            empresa: true,
            periodoContable: true,
          }
        },
        planCuenta: true,
        entidadComercial: true,
        tipoDocumentoOrigen: true,
      },
      orderBy: [
        { asientoContable: { fechaAsiento: 'asc' } },
        { asientoContable: { numeroAsiento: 'asc' } },
        { numeroLinea: 'asc' }
      ]
    });

    if (lineas.length === 0) {
      throw new NotFoundError('No hay líneas para exportar con los filtros seleccionados');
    }

    let contenido = '';
    lineas.forEach((linea) => {
      const fecha = linea.asientoContable.fechaAsiento.toISOString().split('T')[0].replace(/-/g, '');
      const debe = linea.debe > 0 ? linea.debe.toFixed(2) : '';
      const haber = linea.haber > 0 ? linea.haber.toFixed(2) : '';
      
      contenido += `${linea.asientoContable.numeroAsiento}|`;
      contenido += `${fecha}|`;
      contenido += `${linea.glosa}|`;
      contenido += `${linea.tipoDocumentoOrigen?.codigo || ''}|`;
      contenido += `${String(linea.numeroLinea).padStart(4, '0')}|`;
      contenido += `${linea.numeroDocumentoOrigen || ''}|`;
      contenido += `${linea.planCuenta.codigoCuenta}|`;
      contenido += `${linea.planCuenta.nombreCuenta}|`;
      contenido += `${linea.entidadComercial?.ruc || ''}|`;
      contenido += `${debe}|`;
      contenido += `${haber}\n`;
    });

    return contenido;
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al generar formato SUNAT', err.message);
    }
    throw err;
  }
};

const generarExcel = async (filtros) => {
  throw new Error('Exportación a Excel pendiente de implementación');
};

const generarPDF = async (filtros) => {
  throw new Error('Exportación a PDF pendiente de implementación');
};

export default {
  listarLineas,
  generarFormatoSUNAT51,
  generarExcel,
  generarPDF,
};