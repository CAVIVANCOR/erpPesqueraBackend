import prisma from "../../config/prismaClient.js";
import { ValidationError } from "../../utils/errors.js";

const MAX_MOVIMIENTOS = 20000;

/**
 * Datos de apoyo contable para el reporte "Movimiento de Fondos".
 * Para los movimientos indicados devuelve:
 *  - movimientos: asiento contable generado y cuentas contables de contrapartida
 *  - cuentas: cuenta contable de cada cuenta bancaria / caja involucrada
 *  - saldos: saldo anterior y actual de cada cuenta tras cada movimiento (saldos reales)
 * Es solo lectura: no modifica nada.
 */
const obtenerDatosReporteFondos = async (ids = []) => {
  const lista = [...new Set((ids || []).map(Number).filter((n) => Number.isFinite(n) && n > 0))];
  if (lista.length === 0) return { movimientos: {}, cuentas: {}, saldos: [] };
  if (lista.length > MAX_MOVIMIENTOS) {
    throw new ValidationError(
      `El reporte admite hasta ${MAX_MOVIMIENTOS} movimientos. Acote el rango de fechas o los filtros.`
    );
  }

  const movimientos = await prisma.movimientoCaja.findMany({
    where: { id: { in: lista } },
    select: { id: true, cuentaCorrienteOrigenId: true, cuentaCorrienteDestinoId: true },
  });
  const cuentaIds = [
    ...new Set(
      movimientos
        .flatMap((m) => [m.cuentaCorrienteOrigenId, m.cuentaCorrienteDestinoId])
        .filter(Boolean)
        .map(Number)
    ),
  ];

  const submodulo = await prisma.submoduloSistema.findFirst({
    where: { nombreModeloOrigen: "MovimientoCaja", activo: true },
    select: { id: true },
  });

  const [cuentas, saldos, asientos] = await Promise.all([
    prisma.cuentaCorriente.findMany({
      where: { id: { in: cuentaIds } },
      select: {
        id: true,
        cuentaContableId: true,
        cuentaContable: { select: { codigoCuenta: true, nombreCuenta: true } },
      },
    }),
    prisma.saldoCuentaCorriente.findMany({
      where: { movimientoCajaId: { in: lista } },
      select: {
        id: true,
        cuentaCorrienteId: true,
        movimientoCajaId: true,
        fecha: true,
        saldoAnterior: true,
        ingresos: true,
        egresos: true,
        saldoActual: true,
      },
      orderBy: [{ fecha: "asc" }, { id: "asc" }],
    }),
    submodulo
      ? prisma.asientoContable.findMany({
          where: {
            procesoOrigenId: { in: lista },
            submoduloOrigenId: submodulo.id,
            origenAsiento: "AUTOMATICO",
          },
          select: {
            id: true,
            numeroAsiento: true,
            procesoOrigenId: true,
            detalles: {
              select: {
                planCuentaId: true,
                debe: true,
                haber: true,
                planCuenta: { select: { codigoCuenta: true, nombreCuenta: true } },
              },
              orderBy: { numeroLinea: "asc" },
            },
          },
          orderBy: { id: "asc" },
        })
      : [],
  ]);

  const cuentaPorId = new Map(cuentas.map((c) => [Number(c.id), c]));
  const movimientoPorId = new Map(movimientos.map((m) => [Number(m.id), m]));

  // Si un movimiento tuviera varios asientos (p. ej. uno anulado y regenerado) prevalece el último
  const asientoPorMovimiento = new Map();
  asientos.forEach((a) => asientoPorMovimiento.set(Number(a.procesoOrigenId), a));

  const resultadoMovimientos = {};
  asientoPorMovimiento.forEach((asiento, movimientoId) => {
    const movimiento = movimientoPorId.get(movimientoId);
    // Cuentas contables propias del banco/caja: se excluyen para dejar la contrapartida
    const propias = new Set(
      [movimiento?.cuentaCorrienteOrigenId, movimiento?.cuentaCorrienteDestinoId]
        .filter(Boolean)
        .map((id) => Number(cuentaPorId.get(Number(id))?.cuentaContableId))
        .filter(Boolean)
    );
    let lineas = asiento.detalles.filter((d) => !propias.has(Number(d.planCuentaId)));
    if (lineas.length === 0) lineas = asiento.detalles;

    const agrupadas = new Map();
    lineas.forEach((d) => {
      const clave = String(d.planCuentaId);
      const actual = agrupadas.get(clave) || {
        codigoCuenta: d.planCuenta?.codigoCuenta || "",
        nombreCuenta: d.planCuenta?.nombreCuenta || "",
        debe: 0,
        haber: 0,
      };
      actual.debe += Number(d.debe || 0);
      actual.haber += Number(d.haber || 0);
      agrupadas.set(clave, actual);
    });

    resultadoMovimientos[movimientoId] = {
      asiento: { id: asiento.id, numeroAsiento: asiento.numeroAsiento },
      contrapartidas: [...agrupadas.values()],
    };
  });

  const resultadoCuentas = {};
  cuentas.forEach((c) => {
    if (c.cuentaContable) {
      resultadoCuentas[Number(c.id)] = {
        codigoCuenta: c.cuentaContable.codigoCuenta,
        nombreCuenta: c.cuentaContable.nombreCuenta,
      };
    }
  });

  return {
    movimientos: resultadoMovimientos,
    cuentas: resultadoCuentas,
    saldos: saldos.map((s) => ({
      id: s.id,
      cuentaCorrienteId: s.cuentaCorrienteId,
      movimientoCajaId: s.movimientoCajaId,
      fecha: s.fecha,
      saldoAnterior: Number(s.saldoAnterior),
      ingresos: Number(s.ingresos),
      egresos: Number(s.egresos),
      saldoActual: Number(s.saldoActual),
    })),
  };
};

/**
 * Saldos de TODAS las cuentas bancarias / cajas activas de todas las empresas en un rango de fechas, para el
 * reporte "Saldos por Cuentas Bancarias": incluye las cuentas sin movimientos ni saldo en el rango.
 * Por cuenta devuelve (en la moneda de la cuenta):
 *  - saldoInicial: saldo tras el último registro anterior a `desde` (0 si la cuenta no tiene registros)
 *  - saldoFinal: saldo tras el último registro hasta `hasta` (igual al inicial si no se movió)
 *  - ingreso / egreso / cantidad: suma y número de registros de saldo dentro del rango
 * Es solo lectura: no modifica nada.
 */
const obtenerCuentasParaSaldos = async ({ desde, hasta } = {}) => {
  const fechaDesde = new Date(desde);
  const fechaHasta = new Date(hasta);
  if (!desde || !hasta || Number.isNaN(fechaDesde.getTime()) || Number.isNaN(fechaHasta.getTime())) {
    throw new ValidationError("Indique el rango de fechas (desde y hasta) del reporte de saldos por cuentas bancarias.");
  }

  const [cuentas, movidas] = await Promise.all([
    prisma.cuentaCorriente.findMany({
      where: { activa: true },
      select: {
        id: true,
        empresaId: true,
        numeroCuenta: true,
        descripcion: true,
        empresa: { select: { id: true, razonSocial: true, ruc: true, logo: true } },
        banco: { select: { id: true, nombre: true } },
        moneda: { select: { id: true, codigoSunat: true, simbolo: true } },
        cuentaContable: { select: { codigoCuenta: true, nombreCuenta: true } },
      },
      orderBy: { id: "asc" },
    }),
    prisma.saldoCuentaCorriente.groupBy({
      by: ["cuentaCorrienteId"],
      where: { fecha: { gte: fechaDesde, lte: fechaHasta } },
      _sum: { ingresos: true, egresos: true },
      _count: { _all: true },
    }),
  ]);
  const movidasPorCuenta = new Map(movidas.map((g) => [Number(g.cuentaCorrienteId), g]));

  return await Promise.all(
    cuentas.map(async (c) => {
      // Cadena de saldos de la cuenta: fecha e id (el id desempata)
      const [antes, hastaFin] = await Promise.all([
        prisma.saldoCuentaCorriente.findFirst({
          where: { cuentaCorrienteId: c.id, fecha: { lt: fechaDesde } },
          orderBy: [{ fecha: "desc" }, { id: "desc" }],
          select: { saldoActual: true },
        }),
        prisma.saldoCuentaCorriente.findFirst({
          where: { cuentaCorrienteId: c.id, fecha: { lte: fechaHasta } },
          orderBy: [{ fecha: "desc" }, { id: "desc" }],
          select: { saldoActual: true },
        }),
      ]);
      const movida = movidasPorCuenta.get(Number(c.id));
      const { cuentaContable, ...cuenta } = c;
      return {
        cuenta,
        contable: cuentaContable ? { codigoCuenta: cuentaContable.codigoCuenta, nombreCuenta: cuentaContable.nombreCuenta } : null,
        saldoInicial: antes ? Number(antes.saldoActual) : 0,
        saldoFinal: hastaFin ? Number(hastaFin.saldoActual) : 0,
        ingreso: Number(movida?._sum?.ingresos || 0),
        egreso: Number(movida?._sum?.egresos || 0),
        cantidad: movida?._count?._all || 0,
      };
    })
  );
};

export default { obtenerDatosReporteFondos, obtenerCuentasParaSaldos };
