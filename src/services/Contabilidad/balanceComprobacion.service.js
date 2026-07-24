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

    if (filtros.tipoMovimiento === 'SALDOS_INICIALES') {
      whereAsiento.esSaldoInicial = true;
    } else {
      whereAsiento.esSaldoInicial = false;
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

    const cuentasMap = new Map();
    let totalDebe = 0;
    let totalHaber = 0;

    for (const linea of lineas) {
      const cuenta = linea.planCuenta;

      if (filtros.nivelDetalle) {
        const longitudCuenta = cuenta.codigoCuenta.length;
        if (longitudCuenta !== filtros.nivelDetalle) {
          continue;
        }
      }

      const cuentaId = cuenta.id.toString();

      if (!cuentasMap.has(cuentaId)) {
        cuentasMap.set(cuentaId, {
          cuentaId: cuenta.id,
          codigoCuenta: cuenta.codigoCuenta,
          nombreCuenta: cuenta.nombreCuenta,
          nivel: cuenta.nivel,
          tipoCuenta: cuenta.tipoCuenta,
          naturaleza: cuenta.naturaleza,
          debe: 0,
          haber: 0,
          saldo: 0,
          cantidadMovimientos: 0,
          movimientos: [],
        });
      }

      const cuentaData = cuentasMap.get(cuentaId);
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

    for (const cuenta of cuentasMap.values()) {
      cuenta.saldo = cuenta.debe - cuenta.haber;
    }

    let cuentas = Array.from(cuentasMap.values());

    cuentas.sort((a, b) => a.codigoCuenta.localeCompare(b.codigoCuenta));

    const diferencia = totalDebe - totalHaber;
    const estaCuadrado = Math.abs(diferencia) < 0.01;

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
    const tipo = cuenta.tipoCuenta || 'SIN_CLASIFICAR';
    if (!porTipo[tipo]) {
      porTipo[tipo] = {
        cantidad: 0,
        debe: 0,
        haber: 0,
        saldo: 0,
      };
    }
    porTipo[tipo].cantidad++;
    porTipo[tipo].debe += cuenta.debe;
    porTipo[tipo].haber += cuenta.haber;
    porTipo[tipo].saldo += cuenta.saldo;

    top10Movimientos.push({
      codigoCuenta: cuenta.codigoCuenta,
      nombreCuenta: cuenta.nombreCuenta,
      totalMovimiento: cuenta.debe + cuenta.haber,
      cantidadMovimientos: cuenta.cantidadMovimientos,
    });

    // Gastos (cuentas 6x)
    if (cuenta.codigoCuenta.startsWith('6')) {
      topGastos.push({
        nombre: cuenta.nombreCuenta,
        monto: cuenta.debe,
      });
    }

    // Ingresos (cuentas 7x)
    if (cuenta.codigoCuenta.startsWith('7')) {
      topIngresos.push({
        nombre: cuenta.nombreCuenta,
        monto: cuenta.haber,
      });
    }
  }

  top10Movimientos.sort((a, b) => b.totalMovimiento - a.totalMovimiento);
  topGastos.sort((a, b) => b.monto - a.monto);
  topIngresos.sort((a, b) => b.monto - a.monto);

  return {
    porTipo,
    top10Movimientos: top10Movimientos.slice(0, 10),
    topGastos: topGastos.slice(0, 5),
    topIngresos: topIngresos.slice(0, 5),
    totalCuentas: cuentas.length,
    cuentasConSaldo: cuentas.filter(c => Math.abs(c.saldo) > 0.01).length,
  };
}

export default {
  listarBalance,
};