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
      whereAsiento.empresaId = Number(filtros.empresaId);
    }
    if (filtros.periodoContableId) {
      whereAsiento.periodoContableId = Number(filtros.periodoContableId);
    }
    if (filtros.fechaDesde || filtros.fechaHasta) {
      whereAsiento.fechaAsiento = {};
      if (filtros.fechaDesde) whereAsiento.fechaAsiento.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) whereAsiento.fechaAsiento.lte = new Date(filtros.fechaHasta);
    }
    if (filtros.estadoAsientoId) {
      whereAsiento.estadoId = Number(filtros.estadoAsientoId);
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
      if (!where.planCuenta) {
        where.planCuenta = {};
      }
      where.planCuenta.codigoCuenta = { startsWith: filtros.codigoCuentaInicia };
    }

    // Filtro por cuenta específica
    if (filtros.planCuentaId) {
      where.planCuentaId = Number(filtros.planCuentaId);
    }

    // Filtro por entidad comercial
    if (filtros.entidadComercialId) {
      where.entidadComercialId = Number(filtros.entidadComercialId);
    }
    if (filtros.soloConEntidad) {
      where.entidadComercialId = { not: null };
    }

    // Filtro por centro de costo
    if (filtros.centroCostoId) {
      where.centroCostoId = Number(filtros.centroCostoId);
    }

    // Filtro por activo
    if (filtros.activoId) {
      where.activoId = Number(filtros.activoId);
    }

    // Filtro por tipo de documento origen
    if (filtros.tipoDocumentoOrigenId) {
      where.tipoDocumentoOrigenId = Number(filtros.tipoDocumentoOrigenId);
    }

    // Filtro por número de documento origen
    if (filtros.numeroDocumentoOrigen) {
      where.numeroDocumentoOrigen = { contains: filtros.numeroDocumentoOrigen };
    }

    // Filtro por rango de fecha documento origen
    if (filtros.fechaDocumentoDesde || filtros.fechaDocumentoHasta) {
      where.fechaDocumentoOrigen = {};
      if (filtros.fechaDocumentoDesde) where.fechaDocumentoOrigen.gte = new Date(filtros.fechaDocumentoDesde);
      if (filtros.fechaDocumentoHasta) where.fechaDocumentoOrigen.lte = new Date(filtros.fechaDocumentoHasta);
    }


    // Filtro por submódulo origen
    if (filtros.submoduloOrigenLineaId) {
      where.submoduloOrigenLineaId = Number(filtros.submoduloOrigenLineaId);
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

    // Convertir Map a Array y ordenar por código de cuenta (jerárquico)

    const cuentas = Array.from(cuentasMap.values()).sort((a, b) => {
      const codigoA = (a.codigoCuenta || '').padEnd(10, '0');
      const codigoB = (b.codigoCuenta || '').padEnd(10, '0');
      return codigoA.localeCompare(codigoB);
    });

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

    return {
      cuentas,
      totalCuentas: cuentas.length,
      totales: {
        totalDebe,
        totalHaber,
      }
    };
  } catch (err) {
    if (err.code && err.code.startsWith('P')) {
      throw new DatabaseError('Error de base de datos al listar líneas del mayor', err.message);
    }
    throw err;
  }
};

const generarFormatoSUNAT61 = async (filtros) => {
  const { empresaId, periodoContableId, tipoLibro } = filtros;

  const periodo = await prisma.periodoContable.findUnique({
    where: { id: Number(periodoContableId) }
  });

  if (!periodo) {
    throw new Error('Periodo contable no encontrado');
  }

  const anio = periodo.anio;
  const mes = String(periodo.mes).padStart(2, '0');
  const periodoSunat = `${anio}${mes}00`;

  const resultado = await listarLineas(filtros);

  let contenido = '';
  let correlativoGlobal = 1;

  resultado.cuentas.forEach(cuenta => {
    cuenta.movimientos.forEach(mov => {
      const debe = Number(mov.debe) || 0;
      const haber = Number(mov.haber) || 0;
      
      const debeMonedaExtranjera = Number(mov.debeMonedaExtranjera) || 0;
      const haberMonedaExtranjera = Number(mov.haberMonedaExtranjera) || 0;

      const centroCosto = mov.centroCosto?.codigo || '';
      
      const estado = mov.estado === 'ANULADO' ? '8' : '1';

      const correlativoStr = String(correlativoGlobal).padStart(10, '0');

      const linea = [
        periodoSunat,
        correlativoStr,
        cuenta.codigoCuenta || '',
        centroCosto,
        debe.toFixed(2),
        haber.toFixed(2),
        debeMonedaExtranjera.toFixed(2),
        haberMonedaExtranjera.toFixed(2),
        estado
      ].join('|');

      contenido += '|' + linea + '\r\n';
      correlativoGlobal++;
    });
  });

  return contenido;
};

const generarExcel = async (filtros) => {
  // Placeholder - implementar según necesidad
  throw new Error('Exportación Excel desde backend no implementada. Use generación en frontend.');
};

const generarPDF = async (filtros) => {
  // Placeholder - implementar según necesidad
  throw new Error('Exportación PDF desde backend no implementada. Use generación en frontend.');
};

export default {
  listarLineas,
  generarFormatoSUNAT61,
  generarExcel,
  generarPDF
};

