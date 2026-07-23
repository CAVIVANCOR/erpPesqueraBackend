import prisma from '../../config/prismaClient.js';
import { DatabaseError } from '../../utils/errors.js';

/**
 * Servicio para Libro Mayor Contable
 * Agrupa movimientos por cuenta con saldo acumulado
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
    if (filtros.estadoAsientoId) {
      whereAsiento.estadoId = BigInt(filtros.estadoAsientoId);
    }
    if (filtros.tipoLibro) {
      whereAsiento.tipoLibro = filtros.tipoLibro;
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

    // Aplicar filtros de asiento
    if (Object.keys(whereAsiento).length > 0) {
      where.asientoContable = whereAsiento;
    }

    // ========================================
    // CONSULTA SIN PAGINACIÓN (para agrupar)
    // ========================================
    const lineas = await prisma.detalleAsientoContable.findMany({
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
        { planCuentaId: 'asc' },
        { asientoContable: { fechaAsiento: 'asc' } },
        { asientoContable: { numeroAsiento: 'asc' } },
        { numeroLinea: 'asc' }
      ],
    });

    // ========================================
    // AGRUPAR POR CUENTA
    // ========================================
    const cuentasMap = new Map();

    for (const linea of lineas) {
      const cuentaId = linea.planCuentaId.toString();
      const codigoCuenta = linea.planCuenta?.codigoCuenta || '';
      const nombreCuenta = linea.planCuenta?.nombreCuenta || '';
      
      if (!cuentasMap.has(cuentaId)) {
        cuentasMap.set(cuentaId, {
          cuentaId,
          codigoCuenta,
          nombreCuenta,
          planCuenta: linea.planCuenta,
          movimientos: [],
          saldoInicial: 0,
          totales: {
            debe: 0,
            haber: 0,
            saldo: 0
          }
        });
      }

      const cuenta = cuentasMap.get(cuentaId);
      
      // Calcular saldo acumulado dentro de la cuenta
      const debe = Number(linea.debe);
      const haber = Number(linea.haber);
      cuenta.totales.debe += debe;
      cuenta.totales.haber += haber;
      cuenta.totales.saldo += (debe - haber);

      // Agregar movimiento con saldo acumulado
      cuenta.movimientos.push({
        ...linea,
        saldoAcumulado: cuenta.totales.saldo
      });
    }

    // Convertir Map a Array
    const cuentas = Array.from(cuentasMap.values());

    // ========================================
    // CALCULAR TOTALES GENERALES
    // ========================================
    const totales = await prisma.detalleAsientoContable.aggregate({
      where,
      _sum: {
        debe: true,
        haber: true,
      }
    });

    const totalDebe = Number(totales._sum.debe || 0);
    const totalHaber = Number(totales._sum.haber || 0);
    const saldoFinal = totalDebe - totalHaber;

    return {
      cuentas,
      totalCuentas: cuentas.length,
      totalMovimientos: lineas.length,
      totales: {
        totalDebe,
        totalHaber,
        saldoFinal,
      }
    };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar líneas del mayor', err.message);
    }
    throw err;
  }
};

export default {
  listarLineas,
};