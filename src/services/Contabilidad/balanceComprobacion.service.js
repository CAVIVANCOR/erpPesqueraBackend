import prisma from '../../config/prismaClient.js';
import { DatabaseError, ValidationError } from '../../utils/errors.js';

const listarBalance = async (filtros) => {
  try {

    if (!filtros.empresaId || !filtros.periodoContableId) {
      throw new ValidationError('Empresa y Periodo son requeridos');
    }

    const where = {};
    const whereAsiento = {
      empresaId: Number(filtros.empresaId),
      periodoContableId: Number(filtros.periodoContableId),
    };

    if (filtros.fechaDesde || filtros.fechaHasta) {
      whereAsiento.fechaAsiento = {};
      if (filtros.fechaDesde) whereAsiento.fechaAsiento.gte = new Date(filtros.fechaDesde);
      if (filtros.fechaHasta) whereAsiento.fechaAsiento.lte = new Date(filtros.fechaHasta);
    }

    if (filtros.tipoLibro === 'FISCAL') {
      whereAsiento.tipoLibro = 'FISCAL';
    }

    if (filtros.soloSaldosIniciales) {
      whereAsiento.esSaldoInicial = true;
    }
    whereAsiento.estadoId = { in: [Number(76), Number(77)] };

    where.asientoContable = whereAsiento;

    if (filtros.codigoCuentaInicia) {
      where.planCuenta = {
        codigoCuenta: { startsWith: filtros.codigoCuentaInicia }
      };
    }

    const lineas = await prisma.detalleAsientoContable.findMany({
      where,
      include: {
        asientoContable: {
          include: {
            estado: true,
            moneda: true,
          }
        },
        planCuenta: true,
        moneda: true,
        submoduloOrigenLinea: true,
      },
      orderBy: [
        { planCuenta: { codigoCuenta: 'asc' } },
        { asientoContable: { fechaAsiento: 'asc' } },
      ],
    });

    // Calcular saldos iniciales (antes del rango de fechas)
    let lineasSaldoInicial = [];
    if (!filtros.soloSaldosIniciales && filtros.fechaDesde) {
      const whereSaldoInicial = {
        empresaId: Number(filtros.empresaId),
        periodoContableId: Number(filtros.periodoContableId),
        fechaAsiento: { lt: new Date(filtros.fechaDesde) },
        estadoId: { in: [Number(76), Number(77)] },
        esSaldoInicial: false, // AGREGADO: Solo movimientos normales, NO saldos iniciales
      };
      if (filtros.tipoLibro === 'FISCAL') {
        whereSaldoInicial.tipoLibro = 'FISCAL';
      }
      lineasSaldoInicial = await prisma.detalleAsientoContable.findMany({
        where: { asientoContable: whereSaldoInicial },
        include: { planCuenta: true },
      });
    }

    // Pre-cargar todas las cuentas padre necesarias
    const codigosAgrupacion = new Set();
    if (filtros.nivelDetalle) {
      for (const linea of lineas) {
        const codigoAgrupacion = linea.planCuenta.codigoCuenta.substring(0, filtros.nivelDetalle);
        codigosAgrupacion.add(codigoAgrupacion);
      }
    }

    const cuentasPadreMap = new Map();
    if (codigosAgrupacion.size > 0) {

      const cuentasPadre = await prisma.planCuentasContable.findMany({
        where: {
          codigoCuenta: { in: Array.from(codigosAgrupacion) },
        },
      });

      for (const cuenta of cuentasPadre) {
        cuentasPadreMap.set(cuenta.codigoCuenta, cuenta);
      }

    }

    const cuentasMap = new Map();
    let totalDebe = 0;
    let totalHaber = 0;
    let contadorLineas = 0;


    for (const linea of lineas) {
      contadorLineas++;
      const cuenta = linea.planCuenta;

      // Determinar la clave de agrupación según el nivel de detalle
      let codigoAgrupacion = cuenta.codigoCuenta;
      if (filtros.nivelDetalle) {
        // Agrupar por los primeros N dígitos
        codigoAgrupacion = cuenta.codigoCuenta.substring(0, filtros.nivelDetalle);
      }

      // Usar código de agrupación como clave en lugar de ID
      const cuentaKey = codigoAgrupacion;

      if (!cuentasMap.has(cuentaKey)) {
        // Obtener cuenta padre del mapa pre-cargado
        const cuentaPadre = cuentasPadreMap.get(codigoAgrupacion);

        cuentasMap.set(cuentaKey, {
          cuentaId: cuentaPadre?.id || cuenta.id,
          codigoCuenta: codigoAgrupacion,
          nombreCuenta: cuentaPadre?.nombreCuenta || cuenta.nombreCuenta,
          nivel: cuentaPadre?.nivel || cuenta.nivel,
          tipoCuenta: cuentaPadre?.tipoCuenta || cuenta.tipoCuenta,
          naturaleza: cuentaPadre?.naturaleza || cuenta.naturaleza,
          saldoInicialDebe: 0,
          saldoInicialHaber: 0,
          debe: 0,
          haber: 0,
          saldo: 0,
          saldoFinalDebe: 0,
          saldoFinalHaber: 0,
          cantidadMovimientos: 0,
          movimientos: [],
        });
      }

      const cuentaData = cuentasMap.get(cuentaKey);
      const debe = Number(linea.debe);
      const haber = Number(linea.haber);

      cuentaData.debe += debe;
      cuentaData.haber += haber;
      cuentaData.cantidadMovimientos++;

      cuentaData.movimientos.push({
        id: linea.id,
        numeroLinea: linea.numeroLinea,
        glosa: linea.glosa,
        debe,
        haber,
        fechaAsiento: linea.asientoContable.fechaAsiento,
        numeroAsiento: linea.asientoContable.numeroAsiento,
        esSaldoInicial: linea.asientoContable.esSaldoInicial,
        estadoAsiento: linea.asientoContable.estado,
        tipoLibro: linea.asientoContable.tipoLibro,
        submoduloOrigenLineaId: linea.submoduloOrigenLineaId,
        procesoOrigenLineaId: linea.procesoOrigenLineaId,
        submoduloOrigenLinea: linea.submoduloOrigenLinea,
        asientoContableId: linea.asientoContableId,
      });

      totalDebe += debe;
      totalHaber += haber;
    }

    // Procesar saldos iniciales
    for (const linea of lineasSaldoInicial) {
      const cuenta = linea.planCuenta;
      let codigoAgrupacion = cuenta.codigoCuenta;
      if (filtros.nivelDetalle) {
        codigoAgrupacion = cuenta.codigoCuenta.substring(0, filtros.nivelDetalle);
      }
      const cuentaKey = codigoAgrupacion;

      if (cuentasMap.has(cuentaKey)) {
        const cuentaData = cuentasMap.get(cuentaKey);
        cuentaData.saldoInicialDebe += Number(linea.debe);
        cuentaData.saldoInicialHaber += Number(linea.haber);
      }
    }

    // Redondear totales a 2 decimales para evitar errores de precisión
    totalDebe = Math.round(totalDebe * 100) / 100;
    totalHaber = Math.round(totalHaber * 100) / 100;

    for (const cuenta of cuentasMap.values()) {
      cuenta.saldo = cuenta.debe - cuenta.haber;

      // Calcular saldo inicial neto
      const saldoInicialNeto = cuenta.saldoInicialDebe - cuenta.saldoInicialHaber;

      // Calcular saldo final neto
      const saldoFinalNeto = saldoInicialNeto + cuenta.saldo;

      // Distribuir en debe/haber según signo
      if (saldoFinalNeto >= 0) {
        cuenta.saldoFinalDebe = Math.round(saldoFinalNeto * 100) / 100;
        cuenta.saldoFinalHaber = 0;
      } else {
        cuenta.saldoFinalDebe = 0;
        cuenta.saldoFinalHaber = Math.round(Math.abs(saldoFinalNeto) * 100) / 100;
      }

      // Distribuir saldo inicial en debe/haber
      if (saldoInicialNeto >= 0) {
        cuenta.saldoInicialDebe = Math.round(saldoInicialNeto * 100) / 100;
        cuenta.saldoInicialHaber = 0;
      } else {
        cuenta.saldoInicialDebe = 0;
        cuenta.saldoInicialHaber = Math.round(Math.abs(saldoInicialNeto) * 100) / 100;
      }
    }

    let cuentas = Array.from(cuentasMap.values());
    cuentas.sort((a, b) => a.codigoCuenta.localeCompare(b.codigoCuenta));
    cuentas.forEach(c => {
      if (c.movimientos && c.movimientos.length > 0) {
        const tieneSI = c.movimientos.some(m => m.esSaldoInicial);
        const tieneMov = c.movimientos.some(m => !m.esSaldoInicial);
      }
    });
    const diferencia = Math.round((totalDebe - totalHaber) * 100) / 100;
    const estaCuadrado = Math.abs(diferencia) < 0.02;

    const estadisticas = calcularEstadisticas(cuentas);

    return {
      cuentas,
      totales: {
        totalDebe,
        totalHaber,
        diferencia,
        estaCuadrado,
      },
      estadisticas,
      filtrosAplicados: filtros,
    };
  } catch (error) {
    console.error('❌ ========================================');
    console.error('❌ ERROR EN BALANCE DE COMPROBACIÓN');
    console.error('❌ ========================================');
    console.error('❌ Error completo:', error);
    console.error('❌ Error message:', error.message);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ ========================================');

    if (error instanceof ValidationError) {
      throw error;
    }
    throw new DatabaseError('Error al generar balance de comprobación', error);
  }
};

function calcularEstadisticas(cuentas) {
  const porTipo = {};
  const top10Movimientos = [];
  const topGastos = [];
  const topIngresos = [];

  for (const cuenta of cuentas) {
    const tipo = cuenta.tipoCuenta || 'SIN_TIPO';
    if (!porTipo[tipo]) {
      porTipo[tipo] = { cantidad: 0, totalDebe: 0, totalHaber: 0 };
    }
    porTipo[tipo].cantidad++;
    porTipo[tipo].totalDebe += cuenta.debe;
    porTipo[tipo].totalHaber += cuenta.haber;

    if (cuenta.cantidadMovimientos > 0) {
      top10Movimientos.push({
        codigoCuenta: cuenta.codigoCuenta,
        nombreCuenta: cuenta.nombreCuenta,
        cantidadMovimientos: cuenta.cantidadMovimientos,
      });
    }

    if (cuenta.tipoCuenta === 'GASTO' && cuenta.debe > 0) {
      topGastos.push({
        codigoCuenta: cuenta.codigoCuenta,
        nombreCuenta: cuenta.nombreCuenta,
        monto: cuenta.debe,
      });
    }

    if (cuenta.tipoCuenta === 'INGRESO' && cuenta.haber > 0) {
      topIngresos.push({
        codigoCuenta: cuenta.codigoCuenta,
        nombreCuenta: cuenta.nombreCuenta,
        monto: cuenta.haber,
      });
    }
  }

  top10Movimientos.sort((a, b) => b.cantidadMovimientos - a.cantidadMovimientos);
  topGastos.sort((a, b) => b.monto - a.monto);
  topIngresos.sort((a, b) => b.monto - a.monto);

  return {
    porTipo,
    top10Movimientos: top10Movimientos.slice(0, 10),
    topGastos: topGastos.slice(0, 10),
    topIngresos: topIngresos.slice(0, 10),
  };
}

export default {
  listarBalance,
};