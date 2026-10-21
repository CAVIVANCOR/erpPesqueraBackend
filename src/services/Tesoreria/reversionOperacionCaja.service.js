import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError, DatabaseError } from "../../utils/errors.js";
import {
  ESTADO_CUENTA_POR_COBRAR,
  ESTADO_CUENTA_POR_PAGAR,
  ESTADO_DETRACCION,
  ESTADO_RETENCION,
  ESTADO_PERCEPCION,
  ESTADO_PERIODO_CONTABLE,
  ESTADO_PRESTAMO_BANCARIO,
} from "../../utils/estados.constants.js";
import { SUBMODULO_ORIGEN } from "../../utils/submodulos.constants.js";
import cuotaPrestamoService from "./cuotaPrestamo.service.js";
import { importeEnSoles } from "../CuentasPorCobrarPagar/retencionPercepcionPago.helper.js";
import periodoContableService from "../Contabilidad/periodoContable.service.js";
import prestamoRelacionadoService from "./prestamoRelacionado.service.js";
import prestamoEntidadService from "./prestamoEntidad.service.js";
import { recalcularLetra } from "./pagoLetraCambioEspecializado.service.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: REVERSIÓN DE OPERACIONES ESPECIALIZADAS DE CAJA
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Una operación de Tesorería (pago/cobro especializado, pagos múltiples, deudas, préstamos,
 * entrega de fondos, transferencia) se identifica por su número de operación
 * (MovimientoCaja.refOperacionEspecializadaMovCaja) dentro de una empresa.
 *
 * Funciones:
 *   - listarOperaciones : operaciones realizadas (agrupadas por número de operación)
 *   - obtenerPlan       : simulación de solo lectura (qué se elimina, qué se restaura, avisos y bloqueos)
 *   - revertirOperacion : ejecuta la reversión en UNA transacción (todo o nada)
 *
 * Qué deshace (cada punto es el inverso exacto de lo que escribió la operación):
 *   - Pagos aplicados a deudas (CxC, CxP, personal, tributaria, cuotas de préstamo) y las deudas
 *     vuelven a su saldo y estado (misma regla de estados que los servicios de pago).
 *   - Detracción / retención / percepción: importe pagado, saldo y estado (patrón de la detracción).
 *   - Préstamo: cuotas y saldos con las funciones del propio préstamo; desembolso vuelve a APROBADO.
 *   - Entrega a rendir (DetMovsEntregaRendir): solo se limpian los campos de validación de Tesorería.
 *     El monto NO se toca, por eso no hay saldos del responsable que recalcular.
 *   - Asientos contables de los movimientos.
 *   - Filas de saldo de cuenta corriente y recálculo en cascada de las filas posteriores.
 *   - Movimientos de caja.
 *
 * Reglas de seguridad:
 *   - El período contable de los asientos y pagos debe estar ABIERTO.
 *   - Si alguna fila de saldo (de la operación o posterior) está conciliada, se bloquea.
 *   - Movimientos ya revertidos, pagos de letras, inversiones o conciliaciones asociadas: se bloquea.
 *   - No se borra ningún archivo físico: los archivos que queden sin uso se informan en la respuesta
 *     (algunos comprobantes apuntan al PDF de la PreFactura/OC, que es de otro documento).
 *   - El número de operación (contador de la empresa) no se devuelve: queda un hueco en la numeración.
 */

// ════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════
const SUBMODULO_MOVIMIENTOS_CAJA_DEFECTO = SUBMODULO_ORIGEN.MOVIMIENTOS_CAJA; // 54
const SUBMODULO_TRANSFERENCIAS = SUBMODULO_ORIGEN.TESORERIA_PENDIENTES; // 135 (TRANSFERENCIAS_INTERNAS)
const TIPO_MOVIMIENTO_SUNAT = 165; // Detracción / retención / percepción
const TIPO_MOVIMIENTO_ITF_COMISION = 163;
const VENTANA_CONTRAPARTE_MS = 120000; // movimientos de la otra empresa creados en la misma transacción
const CLAVE_BLOQUEO_BASE = 710100000000n;

const ESTADOS_DEUDA_PERSONAL = { PENDIENTE: 114, PAGO_PARCIAL: 115, PAGADO: 116, VENCIDO: 117 };
const ESTADOS_DEUDA_TRIBUTARIA = { PENDIENTE: 120, PAGO_PARCIAL: 121, PAGADO: 122, VENCIDO: 123 };

const ESTADOS_CXC = {
  PENDIENTE: ESTADO_CUENTA_POR_COBRAR.PENDIENTE,
  PAGO_PARCIAL: ESTADO_CUENTA_POR_COBRAR.PAGO_PARCIAL,
  PAGADO: ESTADO_CUENTA_POR_COBRAR.PAGADO,
  VENCIDO: ESTADO_CUENTA_POR_COBRAR.VENCIDO,
};
const ESTADOS_CXP = {
  PENDIENTE: ESTADO_CUENTA_POR_PAGAR.PENDIENTE,
  PAGO_PARCIAL: ESTADO_CUENTA_POR_PAGAR.PAGO_PARCIAL,
  PAGADO: ESTADO_CUENTA_POR_PAGAR.PAGADO,
  VENCIDO: ESTADO_CUENTA_POR_PAGAR.VENCIDO,
};

const IMPUESTOS = {
  detraccion: {
    etiqueta: "Detracción",
    campoMovimiento: "detraccionId",
    delegado: "detraccion",
    estados: { PENDIENTE: ESTADO_DETRACCION.PENDIENTE, PAGADO: ESTADO_DETRACCION.VALIDADO },
  },
  retencion: {
    etiqueta: "Retención",
    campoMovimiento: "retencionId",
    porPagos: true,
    campoPago: "montoRetencion",
    delegado: "retencion",
    estados: { PENDIENTE: ESTADO_RETENCION.PENDIENTE, PAGADO: ESTADO_RETENCION.VALIDADO },
  },
  percepcion: {
    etiqueta: "Percepción",
    campoMovimiento: "percepcionId",
    porPagos: true,
    campoPago: "montoPercepcion",
    delegado: "percepcion",
    estados: { PENDIENTE: ESTADO_PERCEPCION.PENDIENTE, PAGADO: ESTADO_PERCEPCION.VALIDADO },
  },
};

// ════════════════════════════════════════════════════════════
// UTILIDADES
// ════════════════════════════════════════════════════════════
const num = (valor) => Number(valor ?? 0);
const r2 = (valor) => Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;
const unicos = (lista) => [...new Set(lista.map((x) => String(x)))].map((x) => BigInt(x));
const clave = (valor) => String(valor);

const etiquetaDocumento = (objeto) => {
  if (!objeto) return "-";
  const campo = ["numeroDocumento", "numeroPreFactura", "numeroOrdenCompra", "numeroDeclaracion", "numero", "descripcion"].find(
    (c) => objeto[c],
  );
  return campo ? String(objeto[campo]) : `#${objeto.id}`;
};

const estadoDeuda = (estados, estadoActual, saldo, pagado, fechaVencimiento) => {
  const gestionables = [estados.PENDIENTE, estados.PAGO_PARCIAL, estados.PAGADO, estados.VENCIDO];
  // Un documento anulado o canjeado conserva su estado
  if (!gestionables.includes(Number(estadoActual))) return Number(estadoActual);
  if (saldo <= 0) return estados.PAGADO;
  if (pagado > 0) return estados.PAGO_PARCIAL;
  if (fechaVencimiento && new Date(fechaVencimiento) < new Date()) return estados.VENCIDO;
  return estados.PENDIENTE;
};

const nombreCuenta = (cuenta) =>
  cuenta ? `${cuenta.banco?.nombre || "Banco"} ${cuenta.numeroCuenta || `#${cuenta.id}`}` : "-";

/** Delta que una operación sumó al importe pagado de una detracción/retención/percepción. */
const deltaImpuesto = (movimientos, campo, id) => {
  const etiquetados = movimientos.filter((m) => m[campo] && clave(m[campo]) === clave(id));
  if (etiquetados.length === 0) return 0;
  const sunat = etiquetados.filter((m) => Number(m.tipoMovimientoId) === TIPO_MOVIMIENTO_SUNAT);
  const base = sunat.length > 0 ? sunat : etiquetados.filter((m) => Number(m.tipoMovimientoId) !== TIPO_MOVIMIENTO_ITF_COMISION);
  const montos = (base.length > 0 ? base : etiquetados).map((m) => num(m.monto));
  return r2(Math.max(...montos));
};

// ════════════════════════════════════════════════════════════
// LOCALIZACIÓN DE LA OPERACIÓN
// ════════════════════════════════════════════════════════════
const incluirMovimiento = {
  tipoMovimiento: { select: { id: true, nombre: true, esIngreso: true } },
  moneda: { select: { id: true, simbolo: true, codigoSunat: true } },
  empresa: { select: { id: true, razonSocial: true } },
  entidadComercial: { select: { id: true, razonSocial: true } },
};

async function resolverClave(db, { empresaId, correlativo, movimientoId }) {
  if (movimientoId) {
    const movimiento = await db.movimientoCaja.findUnique({
      where: { id: BigInt(movimientoId) },
      select: { id: true, empresaId: true, refOperacionEspecializadaMovCaja: true },
    });
    if (!movimiento) throw new NotFoundError("Movimiento de caja no encontrado.");
    if (!movimiento.refOperacionEspecializadaMovCaja) {
      throw new ValidationError(
        "Este movimiento no pertenece a una operación especializada (no tiene número de operación): no se puede revertir con esta herramienta.",
      );
    }
    return { empresaId: movimiento.empresaId, correlativo: movimiento.refOperacionEspecializadaMovCaja };
  }
  if (!empresaId || !correlativo) {
    throw new ValidationError("Debe indicar la empresa y el número de operación.");
  }
  return { empresaId: BigInt(empresaId), correlativo: BigInt(correlativo) };
}

/**
 * Carga TODO lo que pertenece a la operación. Se usa tanto para el plan (solo lectura)
 * como dentro de la transacción de reversión.
 */
async function cargarOperacion(db, parametros) {
  const { empresaId, correlativo } = await resolverClave(db, parametros);

  const movimientos = await db.movimientoCaja.findMany({
    where: { refOperacionEspecializadaMovCaja: correlativo, empresaId },
    include: incluirMovimiento,
    orderBy: { id: "asc" },
  });
  if (movimientos.length === 0) {
    throw new NotFoundError(`No existe la operación #${correlativo} en la empresa indicada.`);
  }

  // Transferencia entre empresas: los movimientos de la otra empresa comparten el número de operación.
  // El número se repite entre empresas, así que solo se incluyen los creados en la misma transacción.
  const avisosLocalizacion = [];
  if (movimientos.some((m) => Number(m.moduloOrigenMotivoOperacionId) === SUBMODULO_TRANSFERENCIAS)) {
    const tiempos = movimientos.map((m) => m.fechaCreacion?.getTime()).filter(Boolean);
    if (tiempos.length > 0) {
      const contrapartes = await db.movimientoCaja.findMany({
        where: {
          refOperacionEspecializadaMovCaja: correlativo,
          empresaId: { not: empresaId },
          moduloOrigenMotivoOperacionId: SUBMODULO_TRANSFERENCIAS,
          usuarioId: movimientos[0].usuarioId,
          fechaCreacion: {
            gte: new Date(Math.min(...tiempos) - VENTANA_CONTRAPARTE_MS),
            lte: new Date(Math.max(...tiempos) + VENTANA_CONTRAPARTE_MS),
          },
        },
        include: incluirMovimiento,
        orderBy: { id: "asc" },
      });
      if (contrapartes.length > 0) {
        movimientos.push(...contrapartes);
        avisosLocalizacion.push("La operación incluye movimientos de otra empresa (transferencia entre empresas).");
      }
    }
  }

  const movIds = movimientos.map((m) => m.id);
  const enMovimientos = { in: movIds };

  const submoduloCaja = await db.submoduloSistema.findFirst({
    where: { nombreModeloOrigen: "MovimientoCaja", activo: true },
    select: { id: true },
  });

  const [
    pagosCxC,
    pagosCxP,
    pagosPersonal,
    pagosTributaria,
    pagosCuota,
    pagosLetra,
    detMovs,
    prestamosDesembolso,
    pagosPrestamoRel,
    prestamosRelDesembolso,
    pagosPrestamoEnt,
    prestamosEntDesembolso,
    asientos,
    saldos,
    conciliaciones,
    inversiones,
    movimientosInversion,
    reversionesPrevias,
  ] = await Promise.all([
    db.pagoCuentaPorCobrar.findMany({
      where: { OR: [{ movimientoCajaId: enMovimientos }, { refOperacionEspecializadaMovCaja: correlativo, empresaId }] },
      include: { cuentaPorCobrar: true },
    }),
    db.pagoCuentaPorPagar.findMany({
      where: { OR: [{ movimientoCajaId: enMovimientos }, { refOperacionEspecializadaMovCaja: correlativo, empresaId }] },
      include: { cuentaPorPagar: true },
    }),
    db.pagoDeudaPersonal.findMany({
      where: {
        OR: [
          { movimientoCajaId: enMovimientos },
          { refOperacionEspecializadaMovCaja: correlativo, deudaConPersonal: { empresaId } },
        ],
      },
      include: { deudaConPersonal: true },
    }),
    db.pagoDeudaTributaria.findMany({
      where: {
        OR: [
          { movimientoCajaId: enMovimientos },
          { refOperacionEspecializadaMovCaja: correlativo, deudaTributaria: { empresaId } },
        ],
      },
      include: { deudaTributaria: true },
    }),
    db.pagoCuotaPrestamo.findMany({
      where: {
        OR: [
          { movimientoCajaId: enMovimientos },
          { refOperacionEspecializadaMovCaja: correlativo, cuotaPrestamo: { prestamo: { empresaId } } },
        ],
      },
      include: { cuotaPrestamo: { include: { prestamo: true } } },
    }),
    db.pagoLetraCambio.findMany({
      where: {
        OR: [
          { movimientoCajaId: enMovimientos },
          { refOperacionEspecializadaMovCaja: correlativo, letraCambio: { empresaId } },
        ],
      },
      include: { letraCambio: { include: { estado: true } } },
    }),
    db.detMovsEntregaRendir.findMany({
      where: { OR: [{ operacionMovCajaId: enMovimientos }, { refOperacionEspecializadaMovCaja: correlativo, empresaId }] },
    }),
    db.prestamoBancario.findMany({ where: { movimientoCajaDesembolsoId: enMovimientos } }),
    db.pagoPrestamoRelacionado.findMany({
      where: { OR: [{ movimientoCajaPrestatariaId: enMovimientos }, { movimientoCajaPrestamistaId: enMovimientos }] },
      include: { prestamoRelacionado: true },
    }),
    db.prestamoRelacionado.findMany({
      where: {
        OR: [{ movimientoCajaDesembolsoPrestamistaId: enMovimientos }, { movimientoCajaDesembolsoPrestatariaId: enMovimientos }],
      },
    }),
    db.pagoPrestamoEntidad.findMany({
      where: { movimientoCajaId: enMovimientos },
      include: { prestamoEntidad: true },
    }),
    db.prestamoEntidad.findMany({ where: { movimientoCajaDesembolsoId: enMovimientos } }),
    db.asientoContable.findMany({
      where: { submoduloOrigenId: submoduloCaja?.id ?? BigInt(SUBMODULO_MOVIMIENTOS_CAJA_DEFECTO), procesoOrigenId: enMovimientos },
      include: { periodoContable: { select: { id: true, estadoId: true, nombrePeriodo: true } } },
      orderBy: { id: "asc" },
    }),
    db.saldoCuentaCorriente.findMany({
      where: { movimientoCajaId: enMovimientos },
      include: { cuentaCorriente: { include: { banco: true, moneda: true } } },
      orderBy: [{ fecha: "asc" }, { id: "asc" }],
    }),
    db.detalleConciliacionBancaria.count({ where: { movimientoCajaId: enMovimientos } }),
    db.inversionFinanciera.count({ where: { movimientoCajaId: enMovimientos } }),
    db.movimientoInversion.count({ where: { movimientoCajaId: enMovimientos } }),
    db.movimientoCaja.count({ where: { movimientoRevertidoId: enMovimientos } }),
  ]);

  // Factoring: facturas que volvieron a cartera con esta operación (líneas de sus asientos que apuntan al pago de canje)
  const submoduloPagoCxC = await db.submoduloSistema.findFirst({ where: { ruta: "pagoCuentaPorCobrar", activo: true }, select: { id: true } });
  const lineasRecompra =
    submoduloPagoCxC && asientos.length > 0
      ? await db.detalleAsientoContable.findMany({
          where: { asientoContableId: { in: asientos.map((a) => a.id) }, submoduloOrigenLineaId: submoduloPagoCxC.id },
          select: { procesoOrigenLineaId: true },
        })
      : [];
  const pagosRecompra =
    lineasRecompra.length > 0
      ? await db.pagoCuentaPorCobrar.findMany({
          where: { id: { in: unicos(lineasRecompra.map((l) => l.procesoOrigenLineaId)) } },
          include: { cuentaPorCobrar: true },
        })
      : [];

  return {
    clave: { empresaId, correlativo },
    pagosRecompra,
    movimientos,
    movIds,
    pagosCxC,
    pagosCxP,
    pagosPersonal,
    pagosTributaria,
    pagosCuota,
    pagosLetra,
    detMovs,
    prestamosDesembolso,
    pagosPrestamoRel,
    prestamosRelDesembolso,
    pagosPrestamoEnt,
    prestamosEntDesembolso,
    asientos,
    saldos,
    conciliaciones,
    inversiones,
    movimientosInversion,
    reversionesPrevias,
    avisosLocalizacion,
  };
}

// ════════════════════════════════════════════════════════════
// ANÁLISIS: PLAN, BLOQUEOS, AVISOS Y EFECTOS
// ════════════════════════════════════════════════════════════
/** Agrupa pagos por deuda y suma lo aplicado a cada una. */
function agruparPorDeuda(pagos, campoDeudaId, campoDeuda, campoMonto) {
  const grupos = new Map();
  for (const pago of pagos) {
    const id = clave(pago[campoDeudaId]);
    if (!grupos.has(id)) grupos.set(id, { deuda: pago[campoDeuda], aplicado: 0, pagos: [] });
    const grupo = grupos.get(id);
    grupo.aplicado = r2(grupo.aplicado + num(pago[campoMonto]));
    grupo.pagos.push(pago);
  }
  return grupos;
}

/** Calcula cómo quedaría cada deuda (sin escribir nada). */
function proyectarDeuda({ tipo, deuda, aplicado, estados, maximoSaldo, pagadoAnterior = 0, revierteCanje = false }) {
  const pagadoDespues = r2(Math.max(0, num(deuda.montoPagado) - aplicado));
  const saldoDespues = r2(Math.min(maximoSaldo, num(deuda.saldoPendiente) + aplicado));
  // Si lo que se revierte es el canje que dejó la factura en CANJEADA (factoring), vuelve a calcularse como pendiente
  const estadoActual = revierteCanje && Number(deuda.estadoId) === Number(ESTADO_CUENTA_POR_COBRAR.CANJEADO) ? estados.PENDIENTE : deuda.estadoId;
  const estadoDespues = estadoDeuda(estados, estadoActual, saldoDespues, pagadoDespues + pagadoAnterior, deuda.fechaVencimiento);
  return {
    tipo,
    id: deuda.id,
    documento: etiquetaDocumento(deuda),
    aplicado,
    pagadoAntes: num(deuda.montoPagado),
    saldoAntes: num(deuda.saldoPendiente),
    estadoAntes: Number(deuda.estadoId),
    pagadoDespues,
    saldoDespues,
    estadoDespues,
  };
}

async function analizar(db, ctx) {
  const bloqueos = [];
  const avisos = [...ctx.avisosLocalizacion];
  const { movimientos, movIds } = ctx;

  // ── Bloqueos estructurales ──────────────────────────────────────────────
  if (movimientos.some((m) => m.esReversion)) {
    bloqueos.push("La operación contiene movimientos de reversión creados con la función antigua de reversión.");
  }
  if (ctx.reversionesPrevias > 0) {
    bloqueos.push("Alguno de los movimientos ya fue revertido con la función antigua de reversión.");
  }
  if (ctx.conciliaciones > 0) {
    bloqueos.push("La operación tiene movimientos incluidos en una conciliación bancaria.");
  }
  if (ctx.inversiones > 0 || ctx.movimientosInversion > 0) {
    bloqueos.push("La operación tiene movimientos asociados a inversiones financieras.");
  }

  // ── Período contable abierto ────────────────────────────────────────────
  const periodos = new Map();
  for (const asiento of ctx.asientos) {
    if (asiento.periodoContable) periodos.set(clave(asiento.periodoContable.id), asiento.periodoContable);
  }
  const idsPeriodoPagos = unicos(
    [...ctx.pagosCxC, ...ctx.pagosCxP, ...ctx.pagosPersonal, ...ctx.pagosTributaria]
      .map((p) => p.periodoContableId)
      .filter(Boolean),
  ).filter((id) => !periodos.has(clave(id)));
  if (idsPeriodoPagos.length > 0) {
    const extra = await db.periodoContable.findMany({
      where: { id: { in: idsPeriodoPagos } },
      select: { id: true, estadoId: true, nombrePeriodo: true },
    });
    extra.forEach((p) => periodos.set(clave(p.id), p));
  }
  if (periodos.size === 0) {
    try {
      const fecha = movimientos[0].fechaOperacionMovCaja;
      const periodo = fecha ? await periodoContableService.obtenerPeriodoPorFecha(Number(ctx.clave.empresaId), fecha) : null;
      if (periodo) periodos.set(clave(periodo.id), periodo);
    } catch (error) {
      avisos.push("No se pudo comprobar el período contable de la operación.");
    }
  }
  for (const periodo of periodos.values()) {
    if (Number(periodo.estadoId) !== ESTADO_PERIODO_CONTABLE.ABIERTO) {
      bloqueos.push(`El período contable ${periodo.nombrePeriodo || `#${periodo.id}`} no está abierto: no se puede revertir.`);
    }
  }

  // ── Cuentas corrientes: cadena de saldos ────────────────────────────────
  const porCuenta = new Map();
  for (const saldo of ctx.saldos) {
    const id = clave(saldo.cuentaCorrienteId);
    if (!porCuenta.has(id)) porCuenta.set(id, { cuenta: saldo.cuentaCorriente, filas: [] });
    porCuenta.get(id).filas.push(saldo);
  }
  if (ctx.saldos.some((s) => s.conciliado)) {
    bloqueos.push("Alguna fila de saldo de la operación ya está conciliada.");
  }
  const cuentas = [];
  for (const [cuentaId, { cuenta, filas }] of porCuenta) {
    const inicio = filas[0];
    const idsSaldosOperacion = ctx.saldos.map((s) => s.id);
    const [previa, filasPosteriores, ultima] = await Promise.all([
      db.saldoCuentaCorriente.findFirst({
        where: {
          cuentaCorrienteId: BigInt(cuentaId),
          id: { notIn: idsSaldosOperacion },
          OR: [{ fecha: { lt: inicio.fecha } }, { fecha: inicio.fecha, id: { lt: inicio.id } }],
        },
        orderBy: [{ fecha: "desc" }, { id: "desc" }],
      }),
      db.saldoCuentaCorriente.findMany({
        where: {
          cuentaCorrienteId: BigInt(cuentaId),
          id: { notIn: idsSaldosOperacion },
          OR: [{ fecha: { gt: inicio.fecha } }, { fecha: inicio.fecha, id: { gt: inicio.id } }],
        },
        orderBy: [{ fecha: "asc" }, { id: "asc" }],
      }),
      db.saldoCuentaCorriente.findFirst({
        where: { cuentaCorrienteId: BigInt(cuentaId) },
        orderBy: [{ fecha: "desc" }, { id: "desc" }],
      }),
    ]);
    if (filasPosteriores.some((f) => f.conciliado)) {
      bloqueos.push(`La cuenta ${nombreCuenta(cuenta)} tiene saldos posteriores ya conciliados.`);
    }

    // Simulación de la misma cadena que recalculará la reversión (saldo final exacto y filas que cambian)
    let corriente = previa ? num(previa.saldoActual) : num(inicio.saldoAnterior);
    let filasQueCambian = 0;
    for (const fila of filasPosteriores) {
      const anterior = r2(corriente);
      const actual = r2(anterior + num(fila.ingresos) - num(fila.egresos));
      if (r2(fila.saldoAnterior) !== anterior || r2(fila.saldoActual) !== actual) filasQueCambian++;
      corriente = actual;
    }
    if (filasPosteriores.length > 0) {
      avisos.push(
        `La cuenta ${nombreCuenta(cuenta)} tiene ${filasPosteriores.length} registro(s) de saldo posterior(es) que se recalcularán (${filasQueCambian} cambian de valor).`,
      );
    }
    cuentas.push({
      cuentaCorrienteId: Number(cuentaId),
      cuenta: nombreCuenta(cuenta),
      simbolo: cuenta?.moneda?.simbolo || "",
      saldoAntes: ultima ? num(ultima.saldoActual) : 0,
      saldoDespues: r2(corriente),
      posteriores: filasPosteriores.length,
    });
  }

  // ── Deudas ──────────────────────────────────────────────────────────────
  const deudas = [];
  for (const g of agruparPorDeuda(ctx.pagosCxC, "cuentaPorCobrarId", "cuentaPorCobrar", "montoAplicadoDeuda").values()) {
    // Un pago ligado a un préstamo de factoring (prestamoBancarioId, sin caja) es el canje de la factura
    const revierteCanje = g.pagos.some((p) => p.prestamoBancarioId);
    deudas.push(proyectarDeuda({ tipo: "Cuenta por cobrar", deuda: g.deuda, aplicado: g.aplicado, estados: ESTADOS_CXC, maximoSaldo: num(g.deuda.montoTotal), revierteCanje }));
  }
  for (const g of agruparPorDeuda(ctx.pagosCxP, "cuentaPorPagarId", "cuentaPorPagar", "montoAplicadoDeuda").values()) {
    deudas.push(proyectarDeuda({ tipo: "Cuenta por pagar", deuda: g.deuda, aplicado: g.aplicado, estados: ESTADOS_CXP, maximoSaldo: num(g.deuda.montoTotal) }));
  }
  for (const g of agruparPorDeuda(ctx.pagosPersonal, "deudaConPersonalId", "deudaConPersonal", "montoPago").values()) {
    deudas.push(
      proyectarDeuda({
        tipo: "Deuda con personal",
        deuda: g.deuda,
        aplicado: g.aplicado,
        estados: ESTADOS_DEUDA_PERSONAL,
        maximoSaldo: r2(num(g.deuda.montoOriginal) - num(g.deuda.montoPagadoAnterior)),
        pagadoAnterior: num(g.deuda.montoPagadoAnterior),
      }),
    );
  }
  for (const g of agruparPorDeuda(ctx.pagosTributaria, "deudaTributariaId", "deudaTributaria", "montoPago").values()) {
    deudas.push(
      proyectarDeuda({
        tipo: "Deuda tributaria",
        deuda: g.deuda,
        aplicado: g.aplicado,
        estados: ESTADOS_DEUDA_TRIBUTARIA,
        maximoSaldo: r2(num(g.deuda.montoOriginal) - num(g.deuda.montoPagadoAnterior)),
        pagadoAnterior: num(g.deuda.montoPagadoAnterior),
      }),
    );
  }

  // ── Detracción / retención / percepción ─────────────────────────────────
  const impuestos = [];
  for (const [llave, config] of Object.entries(IMPUESTOS)) {
    // Detracción: lo que sumó la operación sale de sus movimientos de caja (tienen detraccionId).
    // Retención y percepción: no mueven dinero propio; lo que sumó la operación sale de sus pagos
    // (montoRetencion / montoPercepcion), con la misma conversión a soles que usó el registro.
    const candidatos = [];
    if (!config.porPagos) {
      for (const id of unicos(movimientos.map((m) => m[config.campoMovimiento]).filter(Boolean))) {
        const documento = await db[config.delegado].findUnique({ where: { id } });
        if (documento) candidatos.push({ documento, delta: deltaImpuesto(movimientos, config.campoMovimiento, id) });
      }
    } else {
      const acumulados = new Map();
      const acumular = (pagos, campoDeuda, campoDocumento) => {
        for (const pago of pagos) {
          const documentoId = pago[campoDeuda]?.[campoDocumento];
          const monto = num(pago[config.campoPago]);
          if (!documentoId || !(monto > 0)) continue;
          const llaveDocumento = `${campoDocumento}:${documentoId}`;
          const previo = acumulados.get(llaveDocumento) || { campoDocumento, documentoId, total: 0 };
          previo.total += importeEnSoles(monto, pago.monedaDeudaId, pago.tipoCambio);
          acumulados.set(llaveDocumento, previo);
        }
      };
      acumular(ctx.pagosCxC, "cuentaPorCobrar", "preFacturaId");
      acumular(ctx.pagosCxP, "cuentaPorPagar", "ordenCompraId");
      for (const { campoDocumento, documentoId, total } of acumulados.values()) {
        const documento = await db[config.delegado].findUnique({ where: { [campoDocumento]: documentoId } });
        if (documento) candidatos.push({ documento, delta: r2(Math.min(total, num(documento.importePagado))) });
      }
    }

    for (const { documento, delta } of candidatos) {
      const pagadoDespues = r2(Math.max(0, num(documento.importePagado) - delta));
      const saldoDespues = r2(num(documento.importeRequerido) - pagadoDespues);
      impuestos.push({
        llave,
        tipo: config.etiqueta,
        id: documento.id,
        documento: etiquetaDocumento(documento),
        delta,
        pagadoAntes: num(documento.importePagado),
        saldoAntes: num(documento.saldoPendiente),
        estadoAntes: Number(documento.estadoPagoId),
        pagadoDespues,
        saldoDespues,
        estadoDespues: saldoDespues <= 0 ? config.estados.PAGADO : config.estados.PENDIENTE,
      });
    }
  }

  // ── Préstamos ───────────────────────────────────────────────────────────
  const prestamos = [];

  // Pagos de letras de cambio: se anula el pago y el capital, intereses y mora vuelven a la letra
  const gruposLetra = new Map();
  for (const pago of ctx.pagosLetra) {
    const id = clave(pago.letraCambioId);
    if (!gruposLetra.has(id)) gruposLetra.set(id, { letra: pago.letraCambio, capital: 0 });
    gruposLetra.get(id).capital = r2(gruposLetra.get(id).capital + num(pago.montoCapital));
  }
  for (const { letra, capital } of gruposLetra.values()) {
    const descripcionEstado = letra.estado?.descripcion;
    if (["REFINANCIADA", "ANULADA"].includes(descripcionEstado)) {
      bloqueos.push(`La letra ${letra.numeroDocumento} está ${descripcionEstado}: ${descripcionEstado === "REFINANCIADA" ? "primero revierta su refinanciación" : "no admite reversiones"}.`);
    }
    prestamos.push({
      id: letra.id,
      etiqueta: "Letra",
      numeroPrestamo: letra.numeroDocumento,
      accion: `Se anula el pago: el saldo de capital de la letra sube de ${num(letra.saldoCapital).toFixed(2)} a ${r2(num(letra.saldoCapital) + capital).toFixed(2)} y se descuentan los intereses y la mora pagados`,
    });
  }
  const prestamosCuotas = new Map();
  for (const pago of ctx.pagosCuota) {
    const prestamo = pago.cuotaPrestamo?.prestamo;
    if (prestamo) prestamosCuotas.set(clave(prestamo.id), prestamo);
  }
  for (const prestamo of prestamosCuotas.values()) {
    const cuotas = ctx.pagosCuota
      .filter((p) => clave(p.cuotaPrestamo?.prestamoBancarioId) === clave(prestamo.id))
      .map((p) => p.cuotaPrestamo.numeroCuota)
      .sort((a, b) => a - b);
    prestamos.push({
      id: prestamo.id,
      numeroPrestamo: prestamo.numeroPrestamo,
      accion: `Se anulan los pagos de la(s) cuota(s) ${cuotas.join(", ")} y se recalculan cuotas, saldos y estado del préstamo`,
    });
  }
  for (const prestamo of ctx.prestamosDesembolso) {
    const pagos = await db.pagoCuotaPrestamo.count({ where: { cuotaPrestamo: { prestamoBancarioId: prestamo.id } } });
    if (pagos > 0) {
      bloqueos.push(`El préstamo ${prestamo.numeroPrestamo} ya tiene cuotas pagadas: primero revierta esos pagos.`);
    }
    prestamos.push({
      id: prestamo.id,
      numeroPrestamo: prestamo.numeroPrestamo,
      accion: "El desembolso se anula: el préstamo vuelve a APROBADO y reaparece como desembolso pendiente",
    });
  }

  // ── Factoring: facturas que vuelven a estar canjeadas (el pago de la cuota las había devuelto a cartera) ──
  for (const pago of ctx.pagosRecompra) {
    const factura = pago.cuentaPorCobrar;
    const aplicado = num(pago.montoAplicadoDeuda);
    if (Math.abs(num(factura.saldoPendiente) - aplicado) > 0.01) {
      bloqueos.push(
        `La factura ${etiquetaDocumento(factura)} ya tiene cobros o cambios después de volver a cartera: revierta primero esos cobros para poder revertir el pago de la cuota.`,
      );
    }
    prestamos.push({
      id: pago.id,
      etiqueta: "Factura",
      numeroPrestamo: etiquetaDocumento(factura),
      accion: `Vuelve a estar en descuento (CANJEADA): su saldo ${aplicado.toFixed(2)} se cancela otra vez y se elimina su asiento de recompra`,
    });
  }

  // ── Préstamos entre empresas relacionadas ───────────────────────────────
  const gruposDevolucion = new Map();
  for (const pago of ctx.pagosPrestamoRel) {
    const id = clave(pago.prestamoRelacionadoId);
    if (!gruposDevolucion.has(id)) gruposDevolucion.set(id, { prestamo: pago.prestamoRelacionado, aplicado: 0 });
    gruposDevolucion.get(id).aplicado = r2(gruposDevolucion.get(id).aplicado + num(pago.montoAplicado));
  }
  for (const { prestamo, aplicado } of gruposDevolucion.values()) {
    prestamos.push({
      id: prestamo.id,
      numeroPrestamo: prestamo.numeroPrestamo,
      accion: `Se anula la devolución de ${aplicado.toFixed(2)}: el saldo pendiente del préstamo entre relacionadas sube de ${num(prestamo.saldoCapital).toFixed(2)} a ${r2(num(prestamo.saldoCapital) + aplicado).toFixed(2)} y vuelve a estar vigente`,
    });
  }
  for (const prestamo of ctx.prestamosRelDesembolso) {
    const devoluciones = await db.pagoPrestamoRelacionado.count({
      where: { prestamoRelacionadoId: prestamo.id, id: { notIn: ctx.pagosPrestamoRel.map((p) => p.id) } },
    });
    if (devoluciones > 0) {
      bloqueos.push(
        `El préstamo entre relacionadas N° ${prestamo.numeroPrestamo} ya tiene ${devoluciones} devolución(es) registrada(s): primero revierta esas devoluciones.`,
      );
    }
    prestamos.push({
      id: prestamo.id,
      numeroPrestamo: prestamo.numeroPrestamo,
      accion: "El préstamo entre relacionadas se elimina junto con su desembolso",
    });
  }

  // ── Préstamos con accionistas y terceros ────────────────────────────────
  const gruposPagoEnt = new Map();
  for (const pago of ctx.pagosPrestamoEnt) {
    const id = clave(pago.prestamoEntidadId);
    if (!gruposPagoEnt.has(id)) gruposPagoEnt.set(id, { prestamo: pago.prestamoEntidad, aplicado: 0 });
    gruposPagoEnt.get(id).aplicado = r2(gruposPagoEnt.get(id).aplicado + num(pago.montoAplicado));
  }
  for (const { prestamo, aplicado } of gruposPagoEnt.values()) {
    prestamos.push({
      id: prestamo.id,
      etiqueta: "Préstamo",
      numeroPrestamo: prestamo.numeroPrestamo,
      accion: `Se anula el ${prestamo.sentido === "RECIBIDO" ? "pago" : "cobro"} de ${aplicado.toFixed(2)}: el saldo pendiente del préstamo sube de ${num(prestamo.saldoCapital).toFixed(2)} a ${r2(num(prestamo.saldoCapital) + aplicado).toFixed(2)} y vuelve a estar vigente`,
    });
  }
  for (const prestamo of ctx.prestamosEntDesembolso) {
    const pagos = await db.pagoPrestamoEntidad.count({
      where: { prestamoEntidadId: prestamo.id, id: { notIn: ctx.pagosPrestamoEnt.map((p) => p.id) } },
    });
    if (pagos > 0) {
      bloqueos.push(
        `El préstamo N° ${prestamo.numeroPrestamo} ya tiene ${pagos} ${prestamo.sentido === "RECIBIDO" ? "pago(s)" : "cobro(s)"} registrado(s): primero revierta esas operaciones.`,
      );
    }
    prestamos.push({
      id: prestamo.id,
      etiqueta: "Préstamo",
      numeroPrestamo: prestamo.numeroPrestamo,
      accion: "El préstamo con accionista o tercero se elimina junto con su desembolso",
    });
  }

  // ── Entregas a rendir (asignaciones) ────────────────────────────────────
  const asignaciones = [];
  for (const detMov of ctx.detMovs) {
    const hijos = await db.detMovsEntregaRendir.aggregate({
      where: { asignacionOrigenId: detMov.id },
      _count: { id: true },
      _sum: { monto: true },
    });
    const gastos = hijos._count.id;
    if (gastos > 0) {
      avisos.push(
        `La asignación #${detMov.id} tiene ${gastos} gasto(s) rendido(s) por ${r2(num(hijos._sum.monto))}. Seguirán registrados; solo la asignación vuelve a "por entregar".`,
      );
    }
    asignaciones.push({ id: detMov.id, descripcion: detMov.descripcion || `Asignación #${detMov.id}`, monto: num(detMov.monto), gastosRendidos: gastos });
  }

  const aprobados = ctx.asientos.filter((a) => Number(a.estadoId) === 77).length;
  if (aprobados > 0) avisos.push(`${aprobados} asiento(s) contable(s) está(n) aprobado(s) y se eliminará(n).`);

  if (ctx.movimientos.some((m) => !m.refOperacionEspecializadaMovCaja)) {
    bloqueos.push("Hay movimientos sin número de operación.");
  }

  return {
    operacion: {
      empresaId: Number(ctx.clave.empresaId),
      correlativo: Number(ctx.clave.correlativo),
      empresa: movimientos[0].empresa?.razonSocial || "",
      fecha: movimientos[0].fechaOperacionMovCaja,
    },
    movimientos: movimientos.map((m) => ({
      id: Number(m.id),
      tipo: m.tipoMovimiento?.nombre || "-",
      empresa: m.empresa?.razonSocial || "",
      monto: num(m.monto),
      simbolo: m.moneda?.simbolo || "",
      descripcion: m.descripcion || "",
      entidad: m.entidadComercial?.razonSocial || "",
    })),
    asientos: ctx.asientos.map((a) => ({
      id: Number(a.id),
      numeroAsiento: a.numeroAsiento,
      glosa: a.glosa,
      totalDebe: num(a.totalDebe),
      estadoId: Number(a.estadoId),
    })),
    cuentas,
    deudas,
    impuestos,
    prestamos,
    asignaciones,
    avisos,
    bloqueos,
    puedeRevertir: bloqueos.length === 0,
  };
}

// ════════════════════════════════════════════════════════════
// RECÁLCULO DE LA CADENA DE SALDOS DE UNA CUENTA
// ════════════════════════════════════════════════════════════
/**
 * Recalcula (saldoAnterior / saldoActual) las filas posteriores a la primera fila eliminada.
 * Orden de la cadena: fecha e id. Solo escribe las filas que cambian.
 */
async function recalcularCadenaCuenta(tx, cuentaCorrienteId, inicio) {
  const previa = await tx.saldoCuentaCorriente.findFirst({
    where: {
      cuentaCorrienteId,
      OR: [{ fecha: { lt: inicio.fecha } }, { fecha: inicio.fecha, id: { lt: inicio.id } }],
    },
    orderBy: [{ fecha: "desc" }, { id: "desc" }],
  });
  let corriente = previa ? num(previa.saldoActual) : num(inicio.saldoAnterior);

  const posteriores = await tx.saldoCuentaCorriente.findMany({
    where: {
      cuentaCorrienteId,
      OR: [{ fecha: { gt: inicio.fecha } }, { fecha: inicio.fecha, id: { gt: inicio.id } }],
    },
    orderBy: [{ fecha: "asc" }, { id: "asc" }],
  });

  let actualizadas = 0;
  for (const fila of posteriores) {
    const anterior = r2(corriente);
    const actual = r2(anterior + num(fila.ingresos) - num(fila.egresos));
    if (r2(fila.saldoAnterior) !== anterior || r2(fila.saldoActual) !== actual) {
      await tx.saldoCuentaCorriente.update({
        where: { id: fila.id },
        data: { saldoAnterior: anterior, saldoActual: actual },
      });
      actualizadas++;
    }
    corriente = actual;
  }
  return actualizadas;
}

// ════════════════════════════════════════════════════════════
// API DEL SERVICIO
// ════════════════════════════════════════════════════════════
export async function obtenerPlan(parametros) {
  try {
    const ctx = await cargarOperacion(prisma, parametros);
    return await analizar(prisma, ctx);
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos al analizar la operación", err.message);
    }
    throw err;
  }
}

/**
 * Núcleo de la reversión. Debe ejecutarse DENTRO de una transacción: toma los bloqueos, vuelve a leer y
 * analizar la operación, y recién entonces escribe. Se exporta para poder probarlo con rollback.
 */
export async function ejecutarReversion(tx, { motivo, usuarioId, ...parametros }) {
  // Serializa reversiones concurrentes de la misma operación y de las mismas cuentas
  const previo = await cargarOperacion(tx, parametros);
  const llaves = new Set([
    CLAVE_BLOQUEO_BASE + BigInt(previo.clave.correlativo),
    ...previo.saldos.map((s) => CLAVE_BLOQUEO_BASE + 1000000000n + BigInt(s.cuentaCorrienteId)),
  ]);
  for (const llave of [...llaves].sort((a, b) => (a < b ? -1 : 1))) {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${llave})`;
  }

  // Se vuelve a leer y analizar con los bloqueos tomados: lo que se ejecuta es lo que se valida
  const ctx = await cargarOperacion(tx, parametros);
  const plan = await analizar(tx, ctx);
  if (!plan.puedeRevertir) {
    throw new ValidationError(`No se puede revertir la operación #${plan.operacion.correlativo}:\n- ${plan.bloqueos.join("\n- ")}`);
  }

  const { movIds, movimientos } = ctx;
  const ahora = new Date();

  // 1. Enlaces entre movimientos (transferencias vinculadas)
  await tx.movimientoCaja.updateMany({ where: { movimientoRelacionadoId: { in: movIds } }, data: { movimientoRelacionadoId: null } });
  await tx.movimientoCaja.updateMany({ where: { id: { in: movIds } }, data: { movimientoRelacionadoId: null } });

  // 2. Asientos contables (sus detalles se eliminan en cascada)
  if (ctx.asientos.length > 0) {
    await tx.asientoContable.deleteMany({ where: { id: { in: ctx.asientos.map((a) => a.id) } } });
  }

  // 3. Pagos aplicados a deudas y recálculo de cada deuda
  const actualizarDeuda = async (delegado, proyeccion, datosExtra = {}) => {
    await tx[delegado].update({
      where: { id: proyeccion.id },
      data: {
        montoPagado: proyeccion.pagadoDespues,
        saldoPendiente: proyeccion.saldoDespues,
        estadoId: proyeccion.estadoDespues,
        ...datosExtra,
      },
    });
  };
  const porDelegado = {
    "Cuenta por cobrar": "cuentaPorCobrar",
    "Cuenta por pagar": "cuentaPorPagar",
    "Deuda con personal": "deudaConPersonal",
    "Deuda tributaria": "deudaTributaria",
  };

  if (ctx.pagosCxC.length > 0) await tx.pagoCuentaPorCobrar.deleteMany({ where: { id: { in: ctx.pagosCxC.map((p) => p.id) } } });
  if (ctx.pagosCxP.length > 0) await tx.pagoCuentaPorPagar.deleteMany({ where: { id: { in: ctx.pagosCxP.map((p) => p.id) } } });
  if (ctx.pagosPersonal.length > 0) await tx.pagoDeudaPersonal.deleteMany({ where: { id: { in: ctx.pagosPersonal.map((p) => p.id) } } });
  if (ctx.pagosTributaria.length > 0) await tx.pagoDeudaTributaria.deleteMany({ where: { id: { in: ctx.pagosTributaria.map((p) => p.id) } } });
  if (ctx.pagosCuota.length > 0) await tx.pagoCuotaPrestamo.deleteMany({ where: { id: { in: ctx.pagosCuota.map((p) => p.id) } } });
  // Pagos de letras: se eliminan y cada letra se recalcula desde los pagos que quedan
  if (ctx.pagosLetra.length > 0) {
    await tx.pagoLetraCambio.deleteMany({ where: { id: { in: ctx.pagosLetra.map((p) => p.id) } } });
    for (const letraId of unicos(ctx.pagosLetra.map((p) => p.letraCambioId))) {
      await recalcularLetra(tx, letraId);
    }
  }

  for (const proyeccion of plan.deudas) {
    await actualizarDeuda(porDelegado[proyeccion.tipo], proyeccion, { actualizadoPor: usuarioId ? BigInt(usuarioId) : null });
  }

  // 3b. Factoring: las facturas devueltas a cartera por el pago de la cuota vuelven a quedar canjeadas
  for (const pago of ctx.pagosRecompra) {
    await tx.cuentaPorCobrar.update({
      where: { id: pago.cuentaPorCobrarId },
      data: {
        montoPagado: r2(num(pago.cuentaPorCobrar.montoPagado) + num(pago.montoAplicadoDeuda)),
        saldoPendiente: 0,
        estadoId: ESTADO_CUENTA_POR_COBRAR.CANJEADO,
      },
    });
  }

  // 4. Detracción / retención / percepción (patrón de la detracción)
  for (const impuesto of plan.impuestos) {
    await tx[IMPUESTOS[impuesto.llave].delegado].update({
      where: { id: impuesto.id },
      data: {
        importePagado: impuesto.pagadoDespues,
        saldoPendiente: impuesto.saldoDespues,
        estadoPagoId: impuesto.estadoDespues,
      },
    });
  }

  // 5. Préstamos: cuotas y saldos recalculados desde los pagos que quedan
  const prestamosRecalcular = unicos(
    ctx.pagosCuota.map((p) => p.cuotaPrestamo?.prestamoBancarioId).filter(Boolean),
  );
  for (const prestamoId of prestamosRecalcular) {
    await cuotaPrestamoService.actualizarSaldosPrestamo(prestamoId, tx);
    await cuotaPrestamoService.recalcularEstadoPrestamo(prestamoId, tx);
  }
  for (const prestamo of ctx.prestamosDesembolso) {
    await tx.prestamoBancario.update({
      where: { id: prestamo.id },
      data: { movimientoCajaDesembolsoId: null, estadoId: ESTADO_PRESTAMO_BANCARIO.APROBADO },
    });
  }

  // 5b. Préstamos entre relacionadas: se eliminan las devoluciones y los desembolsos de la operación
  //     y el saldo y estado de los préstamos con devoluciones se recalcula desde los pagos que quedan
  if (ctx.pagosPrestamoRel.length > 0) {
    await tx.pagoPrestamoRelacionado.deleteMany({ where: { id: { in: ctx.pagosPrestamoRel.map((p) => p.id) } } });
    for (const prestamoId of unicos(ctx.pagosPrestamoRel.map((p) => p.prestamoRelacionadoId))) {
      await prestamoRelacionadoService.recalcularPrestamo(tx, prestamoId);
    }
  }
  if (ctx.prestamosRelDesembolso.length > 0) {
    await tx.prestamoRelacionado.deleteMany({ where: { id: { in: ctx.prestamosRelDesembolso.map((p) => p.id) } } });
  }

  // 5c. Préstamos con accionistas y terceros: igual que los relacionados
  if (ctx.pagosPrestamoEnt.length > 0) {
    await tx.pagoPrestamoEntidad.deleteMany({ where: { id: { in: ctx.pagosPrestamoEnt.map((p) => p.id) } } });
    for (const prestamoId of unicos(ctx.pagosPrestamoEnt.map((p) => p.prestamoEntidadId))) {
      await prestamoEntidadService.recalcularPrestamo(tx, prestamoId);
    }
  }
  if (ctx.prestamosEntDesembolso.length > 0) {
    await tx.prestamoEntidad.deleteMany({ where: { id: { in: ctx.prestamosEntDesembolso.map((p) => p.id) } } });
  }

  // 6. Entregas a rendir: solo se limpian los campos de validación (el monto no se toca)
  const urlsDePagos = [...ctx.pagosCxC, ...ctx.pagosCxP, ...ctx.pagosPersonal, ...ctx.pagosTributaria, ...ctx.pagosCuota].flatMap((pago) =>
    Object.entries(pago)
      .filter(([campo, valor]) => /^url/i.test(campo) && typeof valor === "string" && valor)
      .map(([, valor]) => valor),
  );
  const urlsOperacion = new Set(
    [
      ...movimientos.flatMap((m) => [m.urlComprobanteOperacionMovCaja, m.urlOperacionIndividualOperacionCaja, m.urlDocumentoMovCaja]),
      ...urlsDePagos,
    ].filter(Boolean),
  );
  for (const detMov of ctx.detMovs) {
    await tx.detMovsEntregaRendir.update({
      where: { id: detMov.id },
      data: {
        validadoTesoreria: false,
        fechaValidacionTesoreria: null,
        operacionMovCajaId: null,
        fechaOperacionMovCaja: null,
        refOperacionEspecializadaMovCaja: null,
        ...(detMov.urlComprobanteOperacionMovCaja && urlsOperacion.has(detMov.urlComprobanteOperacionMovCaja)
          ? { urlComprobanteOperacionMovCaja: null }
          : {}),
        actualizadoPorId: usuarioId ? BigInt(usuarioId) : null,
      },
    });
  }

  // 7. Saldos de cuenta corriente: se eliminan las filas de la operación y se recalcula la cadena
  const inicios = new Map();
  for (const saldo of ctx.saldos) {
    const id = clave(saldo.cuentaCorrienteId);
    if (!inicios.has(id)) inicios.set(id, saldo); // ya vienen ordenadas por fecha e id
  }
  if (ctx.saldos.length > 0) {
    await tx.saldoCuentaCorriente.deleteMany({ where: { id: { in: ctx.saldos.map((s) => s.id) } } });
  }
  let filasRecalculadas = 0;
  for (const [cuentaId, inicio] of inicios) {
    filasRecalculadas += await recalcularCadenaCuenta(tx, BigInt(cuentaId), inicio);
  }

  // 8. Movimientos de caja
  await tx.movimientoCaja.deleteMany({ where: { id: { in: movIds } } });

  // Informativo: no se borra ningún archivo (algunos comprobantes son el PDF de la PreFactura u OC)
  const archivosAsociados = [...urlsOperacion];
  const auditoria = {
    operacion: plan.operacion.correlativo,
    empresaId: plan.operacion.empresaId,
    usuarioId: usuarioId ? Number(usuarioId) : null,
    motivo: motivo || null,
    fecha: ahora.toISOString(),
    movimientos: movIds.map(Number),
    asientos: ctx.asientos.map((a) => a.numeroAsiento),
    deudas: plan.deudas.map((d) => `${d.tipo} ${d.documento}`),
    filasSaldoRecalculadas: filasRecalculadas,
  };
  console.log("[REVERSION_OPERACION]", JSON.stringify(auditoria));

  return {
    correlativo: plan.operacion.correlativo,
    empresaId: plan.operacion.empresaId,
    movimientosEliminados: movIds.length,
    asientosEliminados: ctx.asientos.length,
    pagosEliminados:
      ctx.pagosCxC.length + ctx.pagosCxP.length + ctx.pagosPersonal.length + ctx.pagosTributaria.length + ctx.pagosCuota.length +
      ctx.pagosPrestamoRel.length + ctx.pagosLetra.length + ctx.pagosPrestamoEnt.length,
    deudasRestauradas: plan.deudas.length,
    impuestosRestaurados: plan.impuestos.length,
    asignacionesRestauradas: ctx.detMovs.length,
    cuentasRecalculadas: inicios.size,
    filasSaldoRecalculadas: filasRecalculadas,
    avisos: plan.avisos,
    archivosAsociados,
  };
}

export async function revertirOperacion({ motivo, usuarioId, ...parametros }) {
  // La confirmación del usuario es el diálogo que detalla lo que se eliminará y restaurará.
  try {
    const resultado = await prisma.$transaction(
      (tx) => ejecutarReversion(tx, { motivo, usuarioId, ...parametros }),
      { maxWait: 15000, timeout: 120000 },
    );
    return resultado;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos al revertir la operación", err.message);
    }
    throw err;
  }
}

// ════════════════════════════════════════════════════════════
// LISTADO DE OPERACIONES REALIZADAS
// ════════════════════════════════════════════════════════════
export async function listarOperaciones({ empresaId, desde, hasta, busqueda, limite = 100 } = {}) {
  try {
    const where = { refOperacionEspecializadaMovCaja: { not: null } };
    if (empresaId) where.empresaId = BigInt(empresaId);

    const rango = {};
    if (desde) rango.gte = new Date(desde);
    if (hasta) {
      const fin = new Date(hasta);
      fin.setHours(23, 59, 59, 999);
      rango.lte = fin;
    }
    if (Object.keys(rango).length > 0) where.fechaOperacionMovCaja = rango;

    const texto = String(busqueda || "").trim().replace(/^#/, "");
    if (texto) {
      if (/^\d+$/.test(texto)) where.refOperacionEspecializadaMovCaja = BigInt(texto);
      else where.descripcion = { contains: texto, mode: "insensitive" };
    }

    const movimientos = await prisma.movimientoCaja.findMany({
      where,
      include: incluirMovimiento,
      orderBy: [{ refOperacionEspecializadaMovCaja: "desc" }, { id: "desc" }],
      take: 2000,
    });

    // Agrupa por empresa + número de operación y une las transferencias entre empresas
    const grupos = [];
    const indice = new Map();
    for (const m of movimientos) {
      const llave = `${m.empresaId}:${m.refOperacionEspecializadaMovCaja}`;
      if (!indice.has(llave)) {
        const grupo = { llave, movimientos: [] };
        indice.set(llave, grupo);
        grupos.push(grupo);
      }
      indice.get(llave).movimientos.push(m);
    }
    const operaciones = [];
    for (const grupo of grupos) {
      const primero = grupo.movimientos[0];
      const esTransferencia = grupo.movimientos.some((m) => Number(m.moduloOrigenMotivoOperacionId) === SUBMODULO_TRANSFERENCIAS);
      const hermano = esTransferencia
        ? operaciones.find(
            (o) =>
              o.esTransferencia &&
              clave(o.correlativo) === clave(primero.refOperacionEspecializadaMovCaja) &&
              clave(o.empresaId) !== clave(primero.empresaId) &&
              clave(o.usuarioId) === clave(primero.usuarioId) &&
              Math.abs((o.creadoEn || 0) - (primero.fechaCreacion?.getTime() || 0)) <= VENTANA_CONTRAPARTE_MS,
          )
        : null;
      if (hermano) {
        hermano.movimientos.push(...grupo.movimientos);
        continue;
      }
      operaciones.push({
        esTransferencia,
        empresaId: primero.empresaId,
        correlativo: primero.refOperacionEspecializadaMovCaja,
        usuarioId: primero.usuarioId,
        creadoEn: primero.fechaCreacion?.getTime() || 0,
        movimientos: [...grupo.movimientos],
      });
    }

    // Clasificación de cada operación por los pagos asociados a sus movimientos
    const todosLosIds = movimientos.map((m) => m.id);
    const enTodos = { in: todosLosIds };
    const [cxc, cxp, personal, tributaria, cuotas, desembolsos, asignaciones, letras, pagosEnt, desembolsosEnt] = await Promise.all([
      prisma.pagoCuentaPorCobrar.findMany({ where: { movimientoCajaId: enTodos }, select: { movimientoCajaId: true, cuentaPorCobrarId: true } }),
      prisma.pagoCuentaPorPagar.findMany({ where: { movimientoCajaId: enTodos }, select: { movimientoCajaId: true, cuentaPorPagarId: true } }),
      prisma.pagoDeudaPersonal.findMany({ where: { movimientoCajaId: enTodos }, select: { movimientoCajaId: true } }),
      prisma.pagoDeudaTributaria.findMany({ where: { movimientoCajaId: enTodos }, select: { movimientoCajaId: true } }),
      prisma.pagoCuotaPrestamo.findMany({ where: { movimientoCajaId: enTodos }, select: { movimientoCajaId: true } }),
      prisma.prestamoBancario.findMany({ where: { movimientoCajaDesembolsoId: enTodos }, select: { movimientoCajaDesembolsoId: true } }),
      prisma.detMovsEntregaRendir.findMany({ where: { operacionMovCajaId: enTodos }, select: { operacionMovCajaId: true } }),
      prisma.pagoLetraCambio.findMany({ where: { movimientoCajaId: enTodos }, select: { movimientoCajaId: true, letraCambio: { select: { tipoLetra: true } } } }),
      prisma.pagoPrestamoEntidad.findMany({ where: { movimientoCajaId: enTodos }, select: { movimientoCajaId: true, prestamoEntidad: { select: { sentido: true } } } }),
      prisma.prestamoEntidad.findMany({ where: { movimientoCajaDesembolsoId: enTodos }, select: { movimientoCajaDesembolsoId: true, sentido: true } }),
    ]);
    const conjunto = (filas, campo) => new Set(filas.map((f) => clave(f[campo])));
    const idsCxC = conjunto(cxc, "movimientoCajaId");
    const idsCxP = conjunto(cxp, "movimientoCajaId");
    const idsPersonal = conjunto(personal, "movimientoCajaId");
    const idsTributaria = conjunto(tributaria, "movimientoCajaId");
    const idsCuotas = conjunto(cuotas, "movimientoCajaId");
    const idsDesembolsos = conjunto(desembolsos, "movimientoCajaDesembolsoId");
    const idsAsignaciones = conjunto(asignaciones, "operacionMovCajaId");
    const idsLetras = conjunto(letras, "movimientoCajaId");
    const idsPagosEnt = conjunto(pagosEnt, "movimientoCajaId");
    const idsDesembolsosEnt = conjunto(desembolsosEnt, "movimientoCajaDesembolsoId");

    const filas = operaciones.map((op) => {
      const ids = op.movimientos.map((m) => clave(m.id));
      const contiene = (conjuntoIds) => ids.some((id) => conjuntoIds.has(id));
      const documentos = (lista, campo) =>
        new Set(lista.filter((p) => ids.includes(clave(p.movimientoCajaId))).map((p) => clave(p[campo]))).size;

      let tipo = "Operación de caja";
      if (op.esTransferencia) tipo = "Transferencia interna";
      else if (contiene(idsCxC)) tipo = documentos(cxc, "cuentaPorCobrarId") > 1 ? "Cobro múltiple de facturas" : "Cobro de factura";
      else if (contiene(idsCxP)) tipo = documentos(cxp, "cuentaPorPagarId") > 1 ? "Pago múltiple de facturas" : "Pago a proveedor";
      else if (contiene(idsPersonal)) tipo = "Pago de deudas de personal";
      else if (contiene(idsTributaria)) tipo = "Pago de deudas tributarias";
      else if (contiene(idsCuotas)) tipo = "Pago de cuotas de préstamo";
      else if (contiene(idsDesembolsos)) tipo = "Desembolso de préstamo";
      else if (contiene(idsAsignaciones)) tipo = "Entrega de fondos";
      else if (contiene(idsDesembolsosEnt)) tipo = desembolsosEnt.some((d) => ids.includes(clave(d.movimientoCajaDesembolsoId)) && d.sentido === "OTORGADO") ? "Préstamo otorgado a accionista / tercero" : "Préstamo recibido de accionista / tercero";
      else if (contiene(idsPagosEnt)) tipo = pagosEnt.some((p) => ids.includes(clave(p.movimientoCajaId)) && p.prestamoEntidad?.sentido === "OTORGADO") ? "Cobranza de préstamo a accionista / tercero" : "Pago de préstamo a accionista / tercero";
      else if (contiene(idsLetras)) tipo = letras.some((l) => ids.includes(clave(l.movimientoCajaId)) && l.letraCambio?.tipoLetra === "COBRAR") ? "Cobranza de letra de cambio" : "Pago de letra de cambio";

      const principales = op.movimientos.filter((m) => Number(m.tipoMovimientoId) !== TIPO_MOVIMIENTO_ITF_COMISION);
      const principal = (principales.length > 0 ? principales : op.movimientos).reduce((a, b) => (num(b.monto) > num(a.monto) ? b : a));
      const fechas = op.movimientos.map((m) => m.fechaOperacionMovCaja?.getTime() || 0);
      return {
        empresaId: Number(op.empresaId),
        empresa: principal.empresa?.razonSocial || "",
        correlativo: Number(op.correlativo),
        fecha: new Date(Math.max(...fechas)),
        tipo,
        detalle: principal.entidadComercial?.razonSocial || principal.descripcion || "",
        monto: num(principal.monto),
        simbolo: principal.moneda?.simbolo || "",
        movimientos: op.movimientos.length,
      };
    });

    return filas
      .sort((a, b) => b.fecha - a.fecha || b.correlativo - a.correlativo)
      .slice(0, Math.min(Number(limite) || 100, 500));
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos al listar las operaciones", err.message);
    }
    throw err;
  }
}

export default { listarOperaciones, obtenerPlan, revertirOperacion, ejecutarReversion };
