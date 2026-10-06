import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";
import correlativoService from "./correlativoOperacionCaja.service.js";
import periodoContableService from "../Contabilidad/periodoContable.service.js";
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";
import { ESTADO_ASIENTO_CONTABLE, ESTADO_CUOTA_PRESTAMO } from "../../utils/estados.constants.js";
import { SUBMODULO_ORIGEN } from "../../utils/submodulos.constants.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: OPERACIONES DE PRÉSTAMO BANCARIO (ESPECIALIZADO)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Dos operaciones de caja del préstamo, cada una en UNA transacción atómica y con su propio
 * movimiento de caja, saldo en cascada y asientos (si algo falla se revierte todo):
 *
 *   1. DESEMBOLSO (ingreso):   el banco deposita el préstamo en la cuenta de la empresa.
 *   2. PAGO DE CUOTAS (egreso): una o varias cuotas de UN mismo préstamo, con un solo egreso.
 *
 * Nunca se mezclan en una misma operación (a diferencia de la transferencia interna, donde
 * egreso e ingreso van juntos): son eventos distintos con datos y cuentas distintas.
 *
 * Convención copiada de los demás servicios de caja:
 *   - Ingreso / egreso principal: la cuenta bancaria va en cuentaCorrienteDestinoId.
 *   - ITF y comisión bancaria:    la cuenta bancaria va en cuentaCorrienteOrigenId.
 *   - Tipo de cambio: siempre TC de venta (sell_price); lo propone el formulario y el usuario
 *     puede editarlo, por eso aquí se respeta el valor recibido.
 *   - Libro: CAJA_BANCOS (tipoLibroId); el campo deprecado tipoLibro queda en FISCAL.
 *   - No se bloquea por saldo insuficiente (el formulario solo advierte).
 *   - Submódulo origen del motivo de la operación: Préstamo Bancario (108).
 *
 * ────────────────────────────────────────────────────────────────────────────
 * MAPA DE BIFURCACIONES (buscar el código de caso, p. ej. "[CASO B]", para seguir el rastro)
 * ────────────────────────────────────────────────────────────────────────────
 * Cada préstamo cae en UNO de dos casos según TipoPrestamo.esFactoring (referencias contables
 * PRÉSTAMOS y FACTORING). Leasing y demás tipos siguen el [CASO A]: la referencia no define
 * un caso propio para ellos.
 *
 *   [CASO A] PRÉSTAMO ESTÁNDAR   TipoPrestamo.esFactoring = false
 *            Desembolso: DEBE banco · HABER 451101 / 451102
 *            Pago cuota: DEBE 451101 / 451102 (capital) · HABER banco
 *   [CASO B] FACTORING           TipoPrestamo.esFactoring = true
 *            Desembolso: DEBE banco · HABER 166111 / 166112   (INGRESO_FACTORING)
 *            Pago cuota: DEBE 454911 / 454912 (capital) · HABER banco   (PAGO_FACTORING)
 *            La referencia usa cuentas distintas en el ingreso (166, activo) y en el pago
 *            (454, pasivo); se sigue tal cual. Si contabilidad la unifica, basta cambiar
 *            CUENTAS_CAPITAL.
 *
 * Los conceptos de la cuota que NO son capital van igual en ambos casos (siempre al DEBE):
 *   interés 673111 · prima del seguro 679101 · mora 679403 · comisión de mantenimiento 679401
 *
 * Dónde se bifurca (en el orden en que ocurre):
 *   paso 1  validación del préstamo (estado, tipo de operación permitida, moneda y cuenta)
 *   paso 2  caso A / B → cuenta del capital (obtenerCuentaCapital)
 *   paso 3  glosa por defecto según el caso
 *   paso 4  asiento principal: líneas del DEBE/HABER según operación y caso
 *   paso 5  ITF y comisión bancaria: iguales en ambos casos (registrarCargosBancarios)
 *
 * IMPUTACIÓN DEL PAGO DE UNA CUOTA (pago parcial permitido): el monto pagado se aplica en este
 * orden de prioridad: comisión → seguro → interés → capital. La parte ya imputada por pagos
 * anteriores se recalcula con la misma regla sobre `CuotaPrestamo.montoPagado` acumulado, así
 * no hace falta guardar el detalle de cada pago parcial. La mora no forma parte de la cuota:
 * se registra aparte en cada operación y se acumula en `montoMora`.
 */

// ════════════════════════════════════════════════════════════
// CONSTANTES
// ════════════════════════════════════════════════════════════
// Estados del préstamo (EstadoMultiFuncion)
const ESTADOS_PRESTAMO = {
  VIGENTE: 81,
  PAGADO: 82,
  VENCIDO: 83,
  REFINANCIADO: 84,
  ANULADO: 85,
};
// Un préstamo admite desembolso o pago de cuotas solo mientras está vigente o vencido
const ESTADOS_PRESTAMO_OPERABLES = [ESTADOS_PRESTAMO.VIGENTE, ESTADOS_PRESTAMO.VENCIDO];

const ESTADO_MOVIMIENTO_CAJA_VALIDADO = 21;
// ITF y comisión comparten el mismo tipo de movimiento
const TIPO_MOVIMIENTO_ITF_COMISION = 163;
const MONEDA_NACIONAL_ID = 1;
const SUBMODULO_ORIGEN_PRESTAMO_ID = SUBMODULO_ORIGEN.PRESTAMO_BANCARIO;

// Cuentas del capital por caso y moneda (ver MAPA DE BIFURCACIONES)
const CUENTAS_CAPITAL = {
  // [CASO A] préstamo estándar: INSTITUCIONES FINANCIERAS M.N. / M.E.
  ESTANDAR: { soles: "451101", dolares: "451102" },
  // [CASO B] factoring: ingreso → FACTORING CLIENTE (166) · pago → FACTORING (454)
  FACTORING_INGRESO: { soles: "166111", dolares: "166112" },
  FACTORING_PAGO: { soles: "454911", dolares: "454912" },
};

// Cuentas de gasto de la cuota, comunes a ambos casos
const CODIGOS_CUENTAS_CONTABLES = {
  INTERESES: "673111",
  PRIMA_SEGURO: "679101",
  INTERESES_MORATORIOS: "679403",
  COMISIONES_BANCARIAS: "679401", // comisión de mantenimiento, comisión inicial y comisión bancaria
  ITF: "641101",
};

// Orden de imputación de un pago a los componentes de la cuota
const ORDEN_IMPUTACION = ["comision", "seguro", "interes", "capital"];

// ════════════════════════════════════════════════════════════
// HELPERS NUMÉRICOS
// ════════════════════════════════════════════════════════════
const aCentimos = (valor) => BigInt(Math.round(Number(valor || 0) * 100));
const deCentimos = (centimos) => Number(centimos) / 100;
const redondear2 = (valor) => Math.round(Number(valor) * 100) / 100;
const minCent = (a, b) => (a < b ? a : b);

/** Componentes que debe una cuota, en céntimos. El capital absorbe cualquier diferencia de redondeo. */
const componentesDebidos = (cuota) => {
  const total = aCentimos(cuota.montoTotal);
  const interes = aCentimos(cuota.montoInteres);
  const comision = aCentimos(cuota.montoComision);
  const seguro = aCentimos(cuota.montoSeguro);
  const capital = total - interes - comision - seguro;
  return { comision, seguro, interes, capital: capital > 0n ? capital : 0n, inconsistente: capital < 0n };
};

/** Imputa `pagadoCent` a los componentes siguiendo ORDEN_IMPUTACION. */
const imputarPago = (debido, pagadoCent) => {
  let resto = pagadoCent;
  const imputado = {};
  for (const clave of ORDEN_IMPUTACION) {
    imputado[clave] = minCent(resto, debido[clave]);
    resto -= imputado[clave];
  }
  return imputado;
};

// ════════════════════════════════════════════════════════════
// HELPERS DE CAJA
// ════════════════════════════════════════════════════════════
const actualizarSaldoCuentaCorriente = async ({
  tx,
  cuentaCorrienteId,
  empresaId,
  fecha,
  ingresos = 0,
  egresos = 0,
  movimientoCajaId,
  saldoAnteriorManual = null,
}) => {
  let saldoAnterior;

  if (saldoAnteriorManual !== null) {
    saldoAnterior = Number(saldoAnteriorManual);
  } else {
    const ultimoSaldo = await tx.saldoCuentaCorriente.findFirst({
      where: { cuentaCorrienteId: Number(cuentaCorrienteId) },
      orderBy: { fecha: "desc" },
    });
    saldoAnterior = ultimoSaldo ? Number(ultimoSaldo.saldoActual) : 0;
  }

  return await tx.saldoCuentaCorriente.create({
    data: {
      cuentaCorrienteId: Number(cuentaCorrienteId),
      empresaId: Number(empresaId),
      fecha,
      saldoAnterior,
      ingresos: Number(ingresos),
      egresos: Number(egresos),
      saldoActual: saldoAnterior + Number(ingresos) - Number(egresos),
      movimientoCajaId: Number(movimientoCajaId),
      centroCostoId: null,
      conciliado: false,
    },
  });
};

/** Crea el movimiento y su registro de saldo en cascada (ingreso o egreso). */
const registrarMovimiento = async ({ tx, data, cuenta, esIngreso, saldoAnteriorManual = null }) => {
  const movimiento = await tx.movimientoCaja.create({ data });

  const registroSaldo = await actualizarSaldoCuentaCorriente({
    tx,
    cuentaCorrienteId: cuenta.id,
    empresaId: cuenta.empresaId,
    fecha: data.fechaOperacionMovCaja,
    ingresos: esIngreso ? data.monto : 0,
    egresos: esIngreso ? 0 : data.monto,
    movimientoCajaId: movimiento.id,
    saldoAnteriorManual,
  });

  return { movimiento, saldoActual: Number(registroSaldo.saldoActual) };
};

const obtenerCuentaPorCodigo = async (tx, codigoCuenta) => {
  const cuenta = await tx.planCuentasContable.findFirst({
    where: { codigoCuenta, activo: true },
  });
  if (!cuenta) {
    throw new NotFoundError(
      `No se encontró la cuenta contable ${codigoCuenta}. Créela en el plan de cuentas antes de registrar esta operación.`,
    );
  }
  return cuenta;
};

// ════════════════════════════════════════════════════════════
// HELPER: ASIENTO CONTABLE (N líneas al DEBE y N líneas al HABER)
// ════════════════════════════════════════════════════════════
/**
 * Los asientos siempre se registran en soles. Cada lado se convierte línea por línea y la
 * diferencia de redondeo se absorbe en la última línea, de modo que ambos lados sumen
 * exactamente el monto del movimiento.
 *
 * @param {Array<{cuentaId, monto, centroCostoId?, documento?, procesoId?}>} lineasDebe
 * @param {Array<{cuentaId, monto, centroCostoId?, documento?, procesoId?}>} lineasHaber
 */
const crearAsiento = async ({
  tx,
  movimiento,
  periodoContable,
  submodulo,
  estadoPendiente,
  lineasDebe,
  lineasHaber,
  glosa,
  tipoCambio,
  esMonedaNacional,
  creadoPor,
}) => {
  const empresaId = Number(movimiento.empresaId);
  const montoOriginal = Number(movimiento.monto);
  const aSoles = (monto) =>
    esMonedaNacional ? redondear2(monto) : redondear2(monto * tipoCambio);
  const totalSoles = aSoles(montoOriginal);

  const convertirLado = (lineas) => {
    const soles = lineas.map((l) => aSoles(l.monto));
    const diferencia = redondear2(totalSoles - soles.reduce((a, b) => a + b, 0));
    soles[soles.length - 1] = redondear2(soles[soles.length - 1] + diferencia);
    return soles;
  };
  const debesSoles = convertirLado(lineasDebe);
  const habersSoles = convertirLado(lineasHaber);

  const ultimoAsiento = await tx.asientoContable.findFirst({
    where: { empresaId, periodoContableId: Number(periodoContable.id) },
    orderBy: { correlativo: "desc" },
  });
  const correlativo = ultimoAsiento ? Number(ultimoAsiento.correlativo) + 1 : 1;
  const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(5, "0")}`;

  const construirLinea = (linea, indice, desplazamiento, esDebe, solesLinea) => ({
    numeroLinea: desplazamiento + indice + 1,
    planCuentaId: linea.cuentaId,
    glosa: linea.glosa || glosa,
    debe: esDebe ? solesLinea : 0,
    haber: esDebe ? 0 : solesLinea,
    monedaId: MONEDA_NACIONAL_ID,
    tipoCambio,
    debeMonedaExtranjera: esDebe && !esMonedaNacional ? redondear2(linea.monto) : null,
    haberMonedaExtranjera: !esDebe && !esMonedaNacional ? redondear2(linea.monto) : null,
    centroCostoId: linea.centroCostoId ?? null,
    entidadComercialId: null,
    tipoDocumentoOrigenId: null,
    numeroDocumentoOrigen: linea.documento?.numeroDocumentoOrigen ?? null,
    fechaDocumentoOrigen: linea.documento?.fechaDocumentoOrigen ?? movimiento.fechaOperacionMovCaja,
    fechaVenceDocumentoOrigen: linea.documento?.fechaVenceDocumentoOrigen ?? null,
    submoduloOrigenLineaId: submodulo.id,
    procesoOrigenLineaId: linea.procesoId ?? movimiento.id,
    creadoPor,
  });

  return await tx.asientoContable.create({
    data: {
      empresaId,
      periodoContableId: Number(periodoContable.id),
      numeroAsiento,
      correlativo,
      fechaAsiento: movimiento.fechaOperacionMovCaja,
      glosa,
      // `tipoLibro` está DEPRECADO (el libro real es `tipoLibroId`): siempre FISCAL
      tipoLibro: "FISCAL",
      tipoLibroId: TIPO_LIBRO.CAJA_BANCOS,
      esGerencial: false,
      esSaldoInicial: false,
      origenAsiento: "AUTOMATICO",
      submoduloOrigenId: submodulo.id,
      procesoOrigenId: movimiento.id,
      estadoId: estadoPendiente.id,
      totalDebe: montoOriginal,
      totalHaber: montoOriginal,
      diferencia: 0,
      estaCuadrado: true,
      monedaId: movimiento.monedaId,
      tipoCambio,
      creadoPor,
      detalles: {
        create: [
          ...lineasDebe.map((l, i) => construirLinea(l, i, 0, true, debesSoles[i])),
          ...lineasHaber.map((l, i) =>
            construirLinea(l, i, lineasDebe.length, false, habersSoles[i]),
          ),
        ],
      },
    },
    include: { moneda: true, empresa: true },
  });
};

// ════════════════════════════════════════════════════════════
// CONTEXTO COMÚN DE LA OPERACIÓN (validaciones y datos compartidos por ambos flujos)
// ════════════════════════════════════════════════════════════
/**
 * Valida cuenta, medio de pago y tipo de movimiento, y resuelve los datos contables comunes:
 * submódulo del asiento, estado, cuentas de ITF/comisión, correlativo y período contable.
 */
const prepararContexto = async ({
  tx,
  prestamo,
  cuentaId,
  medioPagoId,
  tipoMovimientoId,
  fechaOperacion,
  itf,
  comision,
  tipoCambio,
}) => {
  const empresaId = Number(prestamo.empresaId);
  const esMonedaNacional = Number(prestamo.monedaId) === MONEDA_NACIONAL_ID;
  // Siempre TC de venta, editable por el usuario: se respeta el valor recibido
  const tc = esMonedaNacional ? 1 : Number(tipoCambio);
  if (!esMonedaNacional && !(tc > 0)) {
    throw new ValidationError("Debe proporcionar el tipo de cambio para préstamos en moneda extranjera");
  }

  const cuenta = await tx.cuentaCorriente.findUnique({ where: { id: Number(cuentaId) } });
  if (!cuenta) throw new NotFoundError("Cuenta corriente no encontrada.");
  if (Number(cuenta.empresaId) !== empresaId) {
    throw new ValidationError("La cuenta corriente no pertenece a la empresa del préstamo");
  }
  if (Number(cuenta.monedaId) !== Number(prestamo.monedaId)) {
    throw new ValidationError("La moneda de la cuenta corriente no coincide con la del préstamo");
  }
  if (!cuenta.cuentaContableId) {
    throw new ValidationError("La cuenta corriente no tiene cuenta contable asociada");
  }

  const [medioPago, tipoMovimiento, submoduloMovCaja, estadoAsientoPendiente] = await Promise.all([
    tx.medioPago.findUnique({ where: { id: Number(medioPagoId) } }),
    tx.tipoMovEntregaRendir.findFirst({ where: { id: Number(tipoMovimientoId), activo: true } }),
    tx.submoduloSistema.findFirst({ where: { nombreModeloOrigen: "MovimientoCaja", activo: true } }),
    tx.estadoMultiFuncion.findFirst({ where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) } }),
  ]);
  if (!medioPago) throw new NotFoundError("Medio de pago no encontrado.");
  if (!tipoMovimiento) throw new NotFoundError("Tipo de movimiento no encontrado o inactivo.");
  if (!submoduloMovCaja) throw new ValidationError('No se encontró el submódulo "MovimientoCaja"');
  if (!estadoAsientoPendiente) {
    throw new ValidationError("No se encontró el estado PENDIENTE para asientos contables");
  }

  // Las cuentas de gasto de ITF / comisión solo se exigen si hay ITF / comisión
  const cuentaGastoITF = itf > 0 ? await obtenerCuentaPorCodigo(tx, CODIGOS_CUENTAS_CONTABLES.ITF) : null;
  const cuentaGastoComision =
    comision > 0 ? await obtenerCuentaPorCodigo(tx, CODIGOS_CUENTAS_CONTABLES.COMISIONES_BANCARIAS) : null;

  const fechaContable = new Date(fechaOperacion);
  const correlativo = await correlativoService.generarCorrelativo(empresaId, tx);
  const periodoContable = await periodoContableService.obtenerPeriodoPorFecha(empresaId, fechaContable);

  return {
    empresaId,
    esMonedaNacional,
    tc,
    cuenta,
    medioPago,
    tipoMovimiento,
    submoduloMovCaja,
    estadoAsientoPendiente,
    cuentaGastoITF,
    cuentaGastoComision,
    fechaContable,
    correlativo,
    periodoContable,
  };
};

/**
 * [CASO A / B] Cuenta del capital según el tipo de préstamo y la operación.
 * Factoring usa cuentas distintas para el ingreso y para el pago (ver MAPA DE BIFURCACIONES).
 */
const obtenerCuentaCapital = async (tx, prestamo, operacion, esMonedaNacional) => {
  const monedaClave = esMonedaNacional ? "soles" : "dolares";
  let codigos;
  if (prestamo.tipoPrestamo?.esFactoring) {
    // [CASO B] FACTORING
    codigos = operacion === "DESEMBOLSO" ? CUENTAS_CAPITAL.FACTORING_INGRESO : CUENTAS_CAPITAL.FACTORING_PAGO;
  } else {
    // [CASO A] PRÉSTAMO ESTÁNDAR
    codigos = CUENTAS_CAPITAL.ESTANDAR;
  }
  return await obtenerCuentaPorCodigo(tx, codigos[monedaClave]);
};

/**
 * ITF y comisión bancaria de la operación: iguales en ambos casos y en ambas operaciones.
 * Cada uno es un egreso desde la misma cuenta (en cascada tras el movimiento principal) con
 * su propio asiento: DEBE gasto · HABER banco.
 */
const registrarCargosBancarios = async ({
  tx,
  ctx,
  principal,
  baseMovimiento,
  descripcionMovimiento,
  itf,
  comision,
  paramsAsiento,
}) => {
  const asientos = [];

  const itfRegistro =
    itf > 0
      ? await registrarMovimiento({
          tx,
          cuenta: ctx.cuenta,
          esIngreso: false,
          saldoAnteriorManual: principal.saldoActual,
          data: {
            ...baseMovimiento,
            tipoMovimientoId: TIPO_MOVIMIENTO_ITF_COMISION,
            monto: itf,
            cuentaCorrienteOrigenId: ctx.cuenta.id,
            descripcion: `ITF - ${descripcionMovimiento}`,
          },
        })
      : null;

  const comisionRegistro =
    comision > 0
      ? await registrarMovimiento({
          tx,
          cuenta: ctx.cuenta,
          esIngreso: false,
          // ?? y no ||: un saldo de 0 es válido y no debe retroceder al saldo anterior
          saldoAnteriorManual: itfRegistro?.saldoActual ?? principal.saldoActual,
          data: {
            ...baseMovimiento,
            tipoMovimientoId: TIPO_MOVIMIENTO_ITF_COMISION,
            monto: comision,
            cuentaCorrienteOrigenId: ctx.cuenta.id,
            descripcion: `Comisión - ${descripcionMovimiento}`,
          },
        })
      : null;

  if (itfRegistro) {
    asientos.push(
      await crearAsiento({
        ...paramsAsiento,
        movimiento: itfRegistro.movimiento,
        lineasDebe: [
          { cuentaId: ctx.cuentaGastoITF.id, monto: itf, centroCostoId: ctx.cuentaGastoITF.centroCostoId },
        ],
        lineasHaber: [{ cuentaId: ctx.cuenta.cuentaContableId, monto: itf }],
        glosa: `POR EL ITF - ${descripcionMovimiento}`,
      }),
    );
  }

  if (comisionRegistro) {
    asientos.push(
      await crearAsiento({
        ...paramsAsiento,
        movimiento: comisionRegistro.movimiento,
        lineasDebe: [
          {
            cuentaId: ctx.cuentaGastoComision.id,
            monto: comision,
            centroCostoId: ctx.cuentaGastoComision.centroCostoId,
          },
        ],
        lineasHaber: [{ cuentaId: ctx.cuenta.cuentaContableId, monto: comision }],
        glosa: `POR LA COMISION - ${descripcionMovimiento}`,
      }),
    );
  }

  return { itfRegistro, comisionRegistro, asientos };
};

/** Arma la respuesta común: movimientos completos, saldos de la cuenta y resumen. */
const armarRespuestaMovimientos = async ({ tx, principal, itfRegistro, comisionRegistro, etiquetaPrincipal }) => {
  const registros = [principal, itfRegistro, comisionRegistro].filter(Boolean);
  const ids = registros.map((r) => r.movimiento.id);

  const movimientosCompletos = await tx.movimientoCaja.findMany({
    where: { id: { in: ids } },
    include: {
      tipoMovimiento: true,
      moneda: true,
      medioPago: true,
      empresa: true,
      entidadComercial: { select: { id: true, razonSocial: true, numeroDocumento: true } },
      cuentaCorrienteOrigen: { include: { banco: true, moneda: true, empresa: true } },
      cuentaCorrienteDestino: { include: { banco: true, moneda: true, empresa: true } },
    },
  });
  const porId = {};
  movimientosCompletos.forEach((m) => {
    porId[m.id.toString()] = m;
  });

  const etiquetas = {
    [principal.movimiento.id]: etiquetaPrincipal,
    ...(itfRegistro && { [itfRegistro.movimiento.id]: "ITF" }),
    ...(comisionRegistro && { [comisionRegistro.movimiento.id]: "Comisión" }),
  };
  const saldos = await tx.saldoCuentaCorriente.findMany({
    where: { movimientoCajaId: { in: ids } },
    orderBy: { fecha: "asc" },
  });
  const saldosCuentaCorriente = saldos
    .filter((s) => etiquetas[s.movimientoCajaId.toString()])
    .map((s) => ({
      tipo: etiquetas[s.movimientoCajaId.toString()],
      movimientoCajaId: s.movimientoCajaId,
      saldoAnterior: Number(s.saldoAnterior),
      ingresos: Number(s.ingresos),
      egresos: Number(s.egresos),
      saldoActual: Number(s.saldoActual),
    }));

  return {
    movimientos: {
      principal: porId[principal.movimiento.id.toString()] || null,
      itf: itfRegistro ? porId[itfRegistro.movimiento.id.toString()] : null,
      comision: comisionRegistro ? porId[comisionRegistro.movimiento.id.toString()] : null,
    },
    saldosCuentaCorriente,
    saldoFinalCuenta: comisionRegistro?.saldoActual ?? itfRegistro?.saldoActual ?? principal.saldoActual,
    movimientosCreados: registros.length,
  };
};

const traducirErrorPrisma = (err, mensaje) => {
  if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
  if (err.code && err.code.startsWith("P")) throw new DatabaseError(mensaje, err.message);
  throw err;
};

// ════════════════════════════════════════════════════════════
// OPERACIÓN 1: PAGO DE CUOTAS (EGRESO)
// ════════════════════════════════════════════════════════════
/**
 * @param {Object} datos
 * @param {Array<{cuotaPrestamoId:number, monto:number, mora?:number}>} datos.items - Cuotas de UN
 *        mismo préstamo. `monto` = lo que se paga de la cuota (puede ser parcial); `mora` = mora
 *        cobrada en esta operación (no forma parte del monto de la cuota)
 * @param {string|Date} datos.fechaPago
 * @param {number} datos.cuentaCorrienteOrigenId - Cuenta bancaria de donde sale el dinero
 * @param {number} datos.medioPagoId
 * @param {number} datos.tipoMovimientoId - Tipo de movimiento del egreso consolidado
 * @param {string} [datos.numeroOperacion]
 * @param {string} [datos.numeroCheque]
 * @param {string} [datos.descripcion] - Glosa; si no viene se arma según el caso
 * @param {string} [datos.observaciones]
 * @param {number} [datos.itf=0]
 * @param {number} [datos.comision=0] - Comisión bancaria de la transferencia
 * @param {number} [datos.tipoCambio] - TC de venta (editable); solo si el préstamo no es en soles
 * @param {number} datos.usuarioId
 */
const procesarPagoCuotas = async (datos) => {
  const { items, fechaPago, cuentaCorrienteOrigenId, medioPagoId, tipoMovimientoId, numeroOperacion, numeroCheque, observaciones, usuarioId } = datos;

  try {
    // ════════════════════════════════════════════════════════════
    // 0. VALIDACIONES DE ENTRADA
    // ════════════════════════════════════════════════════════════
    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError("Debe seleccionar al menos una cuota");
    }
    const idsItems = items.map((it) => Number(it.cuotaPrestamoId));
    if (idsItems.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new ValidationError("La lista de cuotas contiene identificadores inválidos");
    }
    if (new Set(idsItems).size !== idsItems.length) {
      throw new ValidationError("Una cuota no puede repetirse en el mismo pago");
    }
    if (!fechaPago || !cuentaCorrienteOrigenId || !medioPagoId || !tipoMovimientoId) {
      throw new ValidationError(
        "La fecha, la cuenta corriente, el medio de pago y el tipo de movimiento son obligatorios",
      );
    }

    const montosCent = items.map((it) => {
      const monto = Number(it.monto);
      if (!Number.isFinite(monto) || monto <= 0) {
        throw new ValidationError("El monto a pagar de cada cuota debe ser mayor a cero");
      }
      return aCentimos(monto);
    });
    const morasCent = items.map((it) => {
      const mora = Number(it.mora || 0);
      if (!Number.isFinite(mora) || mora < 0) throw new ValidationError("La mora no puede ser negativa");
      return aCentimos(mora);
    });
    // Total del egreso = lo pagado de cada cuota + la mora cobrada
    const totalCent =
      montosCent.reduce((acc, m) => acc + m, 0n) + morasCent.reduce((acc, m) => acc + m, 0n);
    const montoTotal = deCentimos(totalCent);

    const itf = Number(datos.itf || 0);
    const comision = Number(datos.comision || 0);
    if (itf < 0) throw new ValidationError("El ITF no puede ser negativo.");
    if (comision < 0) throw new ValidationError("La comisión no puede ser negativa.");

    return await prisma.$transaction(
      async (tx) => {
        // ════════════════════════════════════════════════════════════
        // 1. VALIDAR CUOTAS Y PRÉSTAMO
        // ════════════════════════════════════════════════════════════
        const cuotasBD = await tx.cuotaPrestamo.findMany({
          where: { id: { in: idsItems.map((id) => BigInt(id)) } },
          include: {
            prestamo: {
              include: {
                banco: { select: { id: true, nombre: true } },
                tipoPrestamo: { select: { id: true, esFactoring: true } },
              },
            },
          },
        });
        if (cuotasBD.length !== idsItems.length) {
          throw new NotFoundError("Alguna de las cuotas seleccionadas no existe");
        }
        const cuotaPorId = new Map(cuotasBD.map((c) => [Number(c.id), c]));
        // Se respeta el orden en que el usuario envió las cuotas
        const cuotas = idsItems.map((id) => cuotaPorId.get(id));
        const prestamo = cuotas[0].prestamo;

        if (!cuotas.every((c) => Number(c.prestamoBancarioId) === Number(prestamo.id))) {
          throw new ValidationError("Las cuotas deben pertenecer a un mismo préstamo");
        }
        if (!ESTADOS_PRESTAMO_OPERABLES.includes(Number(prestamo.estadoId))) {
          throw new ValidationError(`El préstamo ${prestamo.numeroPrestamo} no admite pagos en su estado actual`);
        }

        const pagadoPreviaCent = [];
        const debidos = cuotas.map((c, i) => {
          if (Number(c.estadoCuotaId) === ESTADO_CUOTA_PRESTAMO.PAGADO || c.saldoInicialPagada) {
            throw new ValidationError(`La cuota ${c.numeroCuota} ya está pagada`);
          }
          const debido = componentesDebidos(c);
          if (debido.inconsistente) {
            throw new ValidationError(
              `La cuota ${c.numeroCuota} tiene componentes mayores a su monto total: corrija el cronograma antes de pagarla`,
            );
          }
          const pagadoPrevio = aCentimos(c.montoPagado);
          pagadoPreviaCent.push(pagadoPrevio);
          const pendiente = aCentimos(c.montoTotal) - pagadoPrevio;
          if (montosCent[i] > pendiente) {
            throw new ValidationError(
              `El monto de la cuota ${c.numeroCuota} (${deCentimos(montosCent[i])}) supera su saldo pendiente (${deCentimos(pendiente)})`,
            );
          }
          return debido;
        });

        // ════════════════════════════════════════════════════════════
        // 2. CONTEXTO COMÚN + CUENTAS DEL ASIENTO (bifurcación [CASO A] / [CASO B])
        // ════════════════════════════════════════════════════════════
        const ctx = await prepararContexto({
          tx,
          prestamo,
          cuentaId: cuentaCorrienteOrigenId,
          medioPagoId,
          tipoMovimientoId,
          fechaOperacion: fechaPago,
          itf,
          comision,
          tipoCambio: datos.tipoCambio,
        });
        const esFactoring = Boolean(prestamo.tipoPrestamo?.esFactoring);

        // Imputación de lo pagado en ESTA operación a cada componente (nuevo acumulado - ya imputado)
        const imputaciones = cuotas.map((c, i) => {
          const antes = imputarPago(debidos[i], pagadoPreviaCent[i]);
          const despues = imputarPago(debidos[i], pagadoPreviaCent[i] + montosCent[i]);
          return {
            comision: despues.comision - antes.comision,
            seguro: despues.seguro - antes.seguro,
            interes: despues.interes - antes.interes,
            capital: despues.capital - antes.capital,
          };
        });

        // Cada cuenta solo se exige si algún componente de la operación la usa
        const usa = (clave) => imputaciones.some((imp) => imp[clave] > 0n);
        const [cuentaCapital, cuentaInteres, cuentaSeguro, cuentaMora, cuentaComisionCuota] = await Promise.all([
          usa("capital") ? obtenerCuentaCapital(tx, prestamo, "PAGO_CUOTA", ctx.esMonedaNacional) : null,
          usa("interes") ? obtenerCuentaPorCodigo(tx, CODIGOS_CUENTAS_CONTABLES.INTERESES) : null,
          usa("seguro") ? obtenerCuentaPorCodigo(tx, CODIGOS_CUENTAS_CONTABLES.PRIMA_SEGURO) : null,
          morasCent.some((m) => m > 0n) ? obtenerCuentaPorCodigo(tx, CODIGOS_CUENTAS_CONTABLES.INTERESES_MORATORIOS) : null,
          usa("comision") ? obtenerCuentaPorCodigo(tx, CODIGOS_CUENTAS_CONTABLES.COMISIONES_BANCARIAS) : null,
        ]);

        // ════════════════════════════════════════════════════════════
        // 3. GLOSA según el caso (solo si el usuario no escribió una)
        // ════════════════════════════════════════════════════════════
        const numerosCuota = cuotas.map((c) => c.numeroCuota).join(", ");
        let glosaPorDefecto;
        if (esFactoring) {
          // [CASO B] FACTORING (referencia PAGO_FACTORING)
          glosaPorDefecto = `PAGO DE FACTORING ${prestamo.banco.nombre} - PRESTAMO ${prestamo.numeroPrestamo} CUOTA(S) ${numerosCuota}`;
        } else {
          // [CASO A] PRÉSTAMO ESTÁNDAR (referencia PAGO_CUOTA_PRESTAMO)
          glosaPorDefecto = `POR EL PAGO DE LA CUOTA DEL PRESTAMO OTORGADO POR ${prestamo.banco.nombre} - PRESTAMO ${prestamo.numeroPrestamo} CUOTA(S) ${numerosCuota}`;
        }
        let descripcionMovimiento = (datos.descripcion && String(datos.descripcion).trim()) || glosaPorDefecto;
        if (numeroCheque) descripcionMovimiento += ` N° CHEQUE: ${numeroCheque}`;

        // ════════════════════════════════════════════════════════════
        // 4. MOVIMIENTO DE EGRESO CONSOLIDADO (+ ITF + COMISIÓN) Y SALDOS EN CASCADA
        // ════════════════════════════════════════════════════════════
        const baseMovimiento = {
          refOperacionEspecializadaMovCaja: ctx.correlativo,
          empresaId: ctx.empresaId,
          entidadComercialId: null,
          monedaId: prestamo.monedaId,
          medioPagoId: Number(medioPagoId),
          fechaOperacionMovCaja: ctx.fechaContable,
          estadoId: ESTADO_MOVIMIENTO_CAJA_VALIDADO,
          esGerencial: false,
          tipoCambio: ctx.tc,
          usuarioId: usuarioId ? Number(usuarioId) : null,
          // Un pago de varias cuotas no tiene un único registro origen: el vínculo es el correlativo
          moduloOrigenMotivoOperacionId: SUBMODULO_ORIGEN_PRESTAMO_ID,
          fechaMotivoOperacion: new Date(),
          usuarioMotivoOperacionId: usuarioId ? Number(usuarioId) : null,
        };

        const egreso = await registrarMovimiento({
          tx,
          cuenta: ctx.cuenta,
          esIngreso: false,
          data: {
            ...baseMovimiento,
            tipoMovimientoId: ctx.tipoMovimiento.id,
            monto: montoTotal,
            cuentaCorrienteDestinoId: ctx.cuenta.id,
            descripcion: descripcionMovimiento,
            numeroOperacionPagoBanco: numeroOperacion || null,
            fechaOperacionPagoBanco: ctx.fechaContable,
          },
        });

        // ════════════════════════════════════════════════════════════
        // 5. ACTUALIZAR CADA CUOTA + LÍNEAS DEL DEBE DEL ASIENTO
        // ════════════════════════════════════════════════════════════
        const distribucion = [];
        const lineasDebe = [];
        const nuevaLinea = (cuenta, montoCent, cuota, concepto) => {
          if (montoCent <= 0n) return;
          lineasDebe.push({
            cuentaId: cuenta.id,
            monto: deCentimos(montoCent),
            centroCostoId: cuenta.centroCostoId ?? null,
            procesoId: cuota.id,
            glosa: `${concepto} cuota ${cuota.numeroCuota} préstamo ${prestamo.numeroPrestamo}`,
            documento: {
              numeroDocumentoOrigen: `${prestamo.numeroPrestamo}-C${cuota.numeroCuota}`,
              fechaDocumentoOrigen: cuota.fechaVencimiento,
              fechaVenceDocumentoOrigen: cuota.fechaVencimiento,
            },
          });
        };

        for (let i = 0; i < cuotas.length; i++) {
          const cuota = cuotas[i];
          const nuevoPagadoCent = pagadoPreviaCent[i] + montosCent[i];
          const saldoCuotaCent = aCentimos(cuota.montoTotal) - nuevoPagadoCent;
          const nuevoEstadoCuotaId =
            saldoCuotaCent === 0n ? ESTADO_CUOTA_PRESTAMO.PAGADO : ESTADO_CUOTA_PRESTAMO.PAGO_PARCIAL;

          const diasAtraso = Math.max(
            0,
            Math.floor((ctx.fechaContable - new Date(cuota.fechaVencimiento)) / 86400000),
          );
          const moraAcumulada = redondear2(Number(cuota.montoMora || 0) + deCentimos(morasCent[i]));

          // Anti doble pago: solo actualiza si la cuota no cambió desde que se leyó
          const reclamo = await tx.cuotaPrestamo.updateMany({
            where: { id: cuota.id, estadoCuotaId: cuota.estadoCuotaId, montoPagado: cuota.montoPagado },
            data: {
              fechaPago: ctx.fechaContable,
              montoPagado: deCentimos(nuevoPagadoCent),
              montoMora: moraAcumulada > 0 ? moraAcumulada : cuota.montoMora,
              diasMora: diasAtraso > 0 ? diasAtraso : cuota.diasMora,
              estadoCuotaId: nuevoEstadoCuotaId,
              movimientoCajaId: egreso.movimiento.id,
              refOperacionEspecializadaMovCaja: ctx.correlativo,
              observaciones: observaciones || cuota.observaciones,
            },
          });
          if (reclamo.count !== 1) {
            throw new ValidationError(
              `La cuota ${cuota.numeroCuota} fue modificada por otro usuario. Recargue e intente nuevamente.`,
            );
          }

          // Líneas del DEBE de esta cuota. El capital va a 451 [CASO A] o 454 [CASO B]
          // (ya resuelto en cuentaCapital); el resto de conceptos es común a ambos casos
          nuevaLinea(cuentaCapital, imputaciones[i].capital, cuota, "Capital");
          nuevaLinea(cuentaInteres, imputaciones[i].interes, cuota, "Interés");
          nuevaLinea(cuentaSeguro, imputaciones[i].seguro, cuota, "Prima de seguro");
          nuevaLinea(cuentaComisionCuota, imputaciones[i].comision, cuota, "Comisión de mantenimiento");
          nuevaLinea(cuentaMora, morasCent[i], cuota, "Mora");

          distribucion.push({
            cuotaPrestamoId: cuota.id,
            numeroCuota: cuota.numeroCuota,
            documento: `${prestamo.numeroPrestamo} - Cuota ${cuota.numeroCuota}`,
            saldoAnterior: deCentimos(aCentimos(cuota.montoTotal) - pagadoPreviaCent[i]),
            montoAplicado: deCentimos(montosCent[i]),
            mora: deCentimos(morasCent[i]),
            nuevoSaldo: deCentimos(saldoCuotaCent),
            estadoCuotaId: nuevoEstadoCuotaId,
            imputacion: {
              capital: deCentimos(imputaciones[i].capital),
              interes: deCentimos(imputaciones[i].interes),
              seguro: deCentimos(imputaciones[i].seguro),
              comision: deCentimos(imputaciones[i].comision),
            },
          });
        }

        // ════════════════════════════════════════════════════════════
        // 6. ACTUALIZAR SALDOS Y ESTADO DEL PRÉSTAMO (con la imputación de pagos parciales)
        // ════════════════════════════════════════════════════════════
        const todasLasCuotas = await tx.cuotaPrestamo.findMany({
          where: { prestamoBancarioId: prestamo.id },
        });
        let capitalPagadoCent = 0n;
        let interesPagadoCent = 0n;
        let saldoInteresCent = 0n;
        let cuotasPendientes = 0;
        for (const c of todasLasCuotas) {
          const debido = componentesDebidos(c);
          if (Number(c.estadoCuotaId) === ESTADO_CUOTA_PRESTAMO.PAGADO || c.saldoInicialPagada) {
            capitalPagadoCent += debido.capital;
            interesPagadoCent += debido.interes;
          } else {
            const imp = imputarPago(debido, aCentimos(c.montoPagado));
            capitalPagadoCent += imp.capital;
            interesPagadoCent += imp.interes;
            saldoInteresCent += debido.interes - imp.interes;
            cuotasPendientes += 1;
          }
        }
        await tx.prestamoBancario.update({
          where: { id: prestamo.id },
          data: {
            capitalPagado: deCentimos(capitalPagadoCent),
            interesPagado: deCentimos(interesPagadoCent),
            saldoCapital: redondear2(Number(prestamo.montoDesembolsado) - deCentimos(capitalPagadoCent)),
            saldoInteres: deCentimos(saldoInteresCent),
            // Sin cuotas pendientes el préstamo queda PAGADO
            ...(cuotasPendientes === 0 ? { estadoId: ESTADOS_PRESTAMO.PAGADO } : {}),
          },
        });

        // ════════════════════════════════════════════════════════════
        // 7. ASIENTOS CONTABLES (si uno falla, se revierte toda la operación)
        // ════════════════════════════════════════════════════════════
        const paramsAsiento = {
          tx,
          periodoContable: ctx.periodoContable,
          submodulo: ctx.submoduloMovCaja,
          estadoPendiente: ctx.estadoAsientoPendiente,
          tipoCambio: ctx.tc,
          esMonedaNacional: ctx.esMonedaNacional,
          creadoPor: usuarioId,
        };

        const asientos = [
          // Asiento principal: DEBE por componente y cuota · HABER banco por el total
          await crearAsiento({
            ...paramsAsiento,
            movimiento: egreso.movimiento,
            lineasDebe,
            lineasHaber: [{ cuentaId: ctx.cuenta.cuentaContableId, monto: montoTotal }],
            glosa: descripcionMovimiento,
          }),
        ];

        // ITF y comisión bancaria (iguales en ambos casos)
        const cargos = await registrarCargosBancarios({
          tx,
          ctx,
          principal: egreso,
          baseMovimiento,
          descripcionMovimiento,
          itf,
          comision,
          paramsAsiento,
        });
        asientos.push(...cargos.asientos);

        await tx.movimientoCaja.updateMany({
          where: {
            id: {
              in: [egreso.movimiento.id, cargos.itfRegistro?.movimiento.id, cargos.comisionRegistro?.movimiento.id].filter(Boolean),
            },
          },
          data: { asientosGenerados: true },
        });

        // ════════════════════════════════════════════════════════════
        // 8. RESPUESTA
        // ════════════════════════════════════════════════════════════
        const respuesta = await armarRespuestaMovimientos({
          tx,
          principal: egreso,
          itfRegistro: cargos.itfRegistro,
          comisionRegistro: cargos.comisionRegistro,
          etiquetaPrincipal: "Egreso",
        });

        return {
          success: true,
          message: `Pago de ${distribucion.length} cuota(s) registrado exitosamente`,
          data: {
            operacion: "PAGO_CUOTAS",
            caso: esFactoring ? "FACTORING" : "PRESTAMO_ESTANDAR",
            correlativo: Number(ctx.correlativo),
            prestamo: {
              id: prestamo.id,
              numeroPrestamo: prestamo.numeroPrestamo,
              banco: prestamo.banco.nombre,
              estadoId: cuotasPendientes === 0 ? ESTADOS_PRESTAMO.PAGADO : prestamo.estadoId,
            },
            movimientoPrincipalId: egreso.movimiento.id,
            movimientoITFId: cargos.itfRegistro?.movimiento.id || null,
            movimientoComisionId: cargos.comisionRegistro?.movimiento.id || null,
            movimientos: respuesta.movimientos,
            saldosCuentaCorriente: respuesta.saldosCuentaCorriente,
            asientosContables: asientos,
            distribucion,
            resumen: {
              cuotasPagadas: distribucion.length,
              montoPagado: montoTotal,
              itf,
              comision,
              totalDebitado: redondear2(montoTotal + itf + comision),
              saldoFinalCuenta: respuesta.saldoFinalCuenta,
              movimientosCreados: respuesta.movimientosCreados,
            },
          },
        };
      },
      { maxWait: 10000, timeout: 60000 },
    );
  } catch (err) {
    return traducirErrorPrisma(err, "Error de base de datos al procesar el pago de cuotas");
  }
};

// ════════════════════════════════════════════════════════════
// OPERACIÓN 2: DESEMBOLSO DEL PRÉSTAMO (INGRESO)
// ════════════════════════════════════════════════════════════
/**
 * @param {Object} datos
 * @param {number} datos.prestamoBancarioId
 * @param {string|Date} datos.fechaDesembolso
 * @param {number} datos.cuentaCorrienteDestinoId - Cuenta bancaria donde el banco depositó
 * @param {number} datos.medioPagoId
 * @param {number} datos.tipoMovimientoId - Tipo de movimiento del ingreso
 * @param {string} [datos.numeroOperacion]
 * @param {string} [datos.descripcion] - Glosa; si no viene se arma según el caso
 * @param {number} [datos.itf=0]
 * @param {number} [datos.comision=0] - Comisión inicial / bancaria cobrada por el banco
 * @param {number} [datos.tipoCambio] - TC de venta (editable); solo si el préstamo no es en soles
 * @param {number} datos.usuarioId
 */
const procesarDesembolso = async (datos) => {
  const { prestamoBancarioId, fechaDesembolso, cuentaCorrienteDestinoId, medioPagoId, tipoMovimientoId, numeroOperacion, usuarioId } = datos;

  try {
    // ════════════════════════════════════════════════════════════
    // 0. VALIDACIONES DE ENTRADA
    // ════════════════════════════════════════════════════════════
    if (!prestamoBancarioId || !fechaDesembolso || !cuentaCorrienteDestinoId || !medioPagoId || !tipoMovimientoId) {
      throw new ValidationError(
        "El préstamo, la fecha, la cuenta corriente, el medio de pago y el tipo de movimiento son obligatorios",
      );
    }
    const itf = Number(datos.itf || 0);
    const comision = Number(datos.comision || 0);
    if (itf < 0) throw new ValidationError("El ITF no puede ser negativo.");
    if (comision < 0) throw new ValidationError("La comisión no puede ser negativa.");

    return await prisma.$transaction(
      async (tx) => {
        // ════════════════════════════════════════════════════════════
        // 1. VALIDAR PRÉSTAMO
        // ════════════════════════════════════════════════════════════
        const prestamo = await tx.prestamoBancario.findUnique({
          where: { id: BigInt(prestamoBancarioId) },
          include: {
            banco: { select: { id: true, nombre: true } },
            tipoPrestamo: { select: { id: true, esFactoring: true } },
            _count: { select: { asientosContables: true } },
          },
        });
        if (!prestamo) throw new NotFoundError("Préstamo bancario no encontrado.");
        if (prestamo.esSaldoInicial) {
          throw new ValidationError("Un préstamo de saldo inicial no tiene desembolso que registrar");
        }
        if (prestamo.movimientoCajaDesembolsoId) {
          throw new ValidationError(`El préstamo ${prestamo.numeroPrestamo} ya tiene su desembolso registrado`);
        }
        // Un préstamo que ya tiene asientos (generados con el flujo anterior) duplicaría la contabilidad
        if (prestamo._count.asientosContables > 0) {
          throw new ValidationError(
            `El préstamo ${prestamo.numeroPrestamo} ya tiene asientos contables: no se puede registrar el desembolso de nuevo`,
          );
        }
        if (!ESTADOS_PRESTAMO_OPERABLES.includes(Number(prestamo.estadoId))) {
          throw new ValidationError(`El préstamo ${prestamo.numeroPrestamo} no admite desembolso en su estado actual`);
        }
        const montoDesembolso = Number(prestamo.montoDesembolsado);
        if (!(montoDesembolso > 0)) {
          throw new ValidationError("El préstamo no tiene un monto desembolsado mayor a cero");
        }

        // ════════════════════════════════════════════════════════════
        // 2. CONTEXTO COMÚN + CUENTA DEL CAPITAL (bifurcación [CASO A] / [CASO B])
        // ════════════════════════════════════════════════════════════
        const ctx = await prepararContexto({
          tx,
          prestamo,
          cuentaId: cuentaCorrienteDestinoId,
          medioPagoId,
          tipoMovimientoId,
          fechaOperacion: fechaDesembolso,
          itf,
          comision,
          tipoCambio: datos.tipoCambio,
        });
        const esFactoring = Boolean(prestamo.tipoPrestamo?.esFactoring);
        const cuentaCapital = await obtenerCuentaCapital(tx, prestamo, "DESEMBOLSO", ctx.esMonedaNacional);

        // ════════════════════════════════════════════════════════════
        // 3. GLOSA según el caso
        // ════════════════════════════════════════════════════════════
        let glosaPorDefecto;
        if (esFactoring) {
          // [CASO B] FACTORING (referencia INGRESO_FACTORING)
          glosaPorDefecto = `POR INGRESO DE FACTORING ${prestamo.banco.nombre} - PRESTAMO ${prestamo.numeroPrestamo}`;
        } else {
          // [CASO A] PRÉSTAMO ESTÁNDAR (referencia INGRESO_PRESTAMO)
          glosaPorDefecto = `POR EL PRESTAMO RECIBIDO DEL ${prestamo.banco.nombre}, SEGÚN CONTRATO - PRESTAMO ${prestamo.numeroPrestamo}`;
        }
        const descripcionMovimiento = (datos.descripcion && String(datos.descripcion).trim()) || glosaPorDefecto;

        // ════════════════════════════════════════════════════════════
        // 4. MOVIMIENTO DE INGRESO (+ ITF + COMISIÓN) Y SALDOS EN CASCADA
        // ════════════════════════════════════════════════════════════
        const baseMovimiento = {
          refOperacionEspecializadaMovCaja: ctx.correlativo,
          empresaId: ctx.empresaId,
          entidadComercialId: null,
          monedaId: prestamo.monedaId,
          medioPagoId: Number(medioPagoId),
          fechaOperacionMovCaja: ctx.fechaContable,
          estadoId: ESTADO_MOVIMIENTO_CAJA_VALIDADO,
          esGerencial: false,
          tipoCambio: ctx.tc,
          usuarioId: usuarioId ? Number(usuarioId) : null,
          moduloOrigenMotivoOperacionId: SUBMODULO_ORIGEN_PRESTAMO_ID,
          origenMotivoOperacionId: prestamo.id,
          fechaMotivoOperacion: new Date(),
          usuarioMotivoOperacionId: usuarioId ? Number(usuarioId) : null,
        };

        const ingreso = await registrarMovimiento({
          tx,
          cuenta: ctx.cuenta,
          esIngreso: true,
          data: {
            ...baseMovimiento,
            tipoMovimientoId: ctx.tipoMovimiento.id,
            monto: montoDesembolso,
            cuentaCorrienteDestinoId: ctx.cuenta.id,
            descripcion: descripcionMovimiento,
            numeroOperacionPagoBanco: numeroOperacion || null,
            fechaOperacionPagoBanco: ctx.fechaContable,
          },
        });

        // ════════════════════════════════════════════════════════════
        // 5. ASIENTOS: DEBE banco · HABER capital (451 [CASO A] / 166 [CASO B])
        // ════════════════════════════════════════════════════════════
        const paramsAsiento = {
          tx,
          periodoContable: ctx.periodoContable,
          submodulo: ctx.submoduloMovCaja,
          estadoPendiente: ctx.estadoAsientoPendiente,
          tipoCambio: ctx.tc,
          esMonedaNacional: ctx.esMonedaNacional,
          creadoPor: usuarioId,
        };

        const asientos = [
          await crearAsiento({
            ...paramsAsiento,
            movimiento: ingreso.movimiento,
            lineasDebe: [{ cuentaId: ctx.cuenta.cuentaContableId, monto: montoDesembolso }],
            lineasHaber: [
              {
                cuentaId: cuentaCapital.id,
                monto: montoDesembolso,
                procesoId: prestamo.id,
                documento: {
                  numeroDocumentoOrigen: prestamo.numeroPrestamo,
                  fechaDocumentoOrigen: prestamo.fechaDesembolso,
                  fechaVenceDocumentoOrigen: prestamo.fechaVencimiento,
                },
              },
            ],
            glosa: descripcionMovimiento,
          }),
        ];

        // ITF y comisión del banco (iguales en ambos casos)
        const cargos = await registrarCargosBancarios({
          tx,
          ctx,
          principal: ingreso,
          baseMovimiento,
          descripcionMovimiento,
          itf,
          comision,
          paramsAsiento,
        });
        asientos.push(...cargos.asientos);

        await tx.movimientoCaja.updateMany({
          where: {
            id: {
              in: [ingreso.movimiento.id, cargos.itfRegistro?.movimiento.id, cargos.comisionRegistro?.movimiento.id].filter(Boolean),
            },
          },
          data: { asientosGenerados: true },
        });

        // ════════════════════════════════════════════════════════════
        // 6. VINCULAR EL DESEMBOLSO AL PRÉSTAMO
        // ════════════════════════════════════════════════════════════
        await tx.prestamoBancario.update({
          where: { id: prestamo.id },
          data: {
            movimientoCajaDesembolsoId: ingreso.movimiento.id,
            fechaContable: ctx.fechaContable,
          },
        });

        // ════════════════════════════════════════════════════════════
        // 7. RESPUESTA
        // ════════════════════════════════════════════════════════════
        const respuesta = await armarRespuestaMovimientos({
          tx,
          principal: ingreso,
          itfRegistro: cargos.itfRegistro,
          comisionRegistro: cargos.comisionRegistro,
          etiquetaPrincipal: "Ingreso",
        });

        return {
          success: true,
          message: `Desembolso del préstamo ${prestamo.numeroPrestamo} registrado exitosamente`,
          data: {
            operacion: "DESEMBOLSO",
            caso: esFactoring ? "FACTORING" : "PRESTAMO_ESTANDAR",
            correlativo: Number(ctx.correlativo),
            prestamo: {
              id: prestamo.id,
              numeroPrestamo: prestamo.numeroPrestamo,
              banco: prestamo.banco.nombre,
              montoDesembolsado: montoDesembolso,
            },
            movimientoPrincipalId: ingreso.movimiento.id,
            movimientoITFId: cargos.itfRegistro?.movimiento.id || null,
            movimientoComisionId: cargos.comisionRegistro?.movimiento.id || null,
            movimientos: respuesta.movimientos,
            saldosCuentaCorriente: respuesta.saldosCuentaCorriente,
            asientosContables: asientos,
            resumen: {
              montoDesembolsado: montoDesembolso,
              itf,
              comision,
              totalNeto: redondear2(montoDesembolso - itf - comision),
              saldoFinalCuenta: respuesta.saldoFinalCuenta,
              movimientosCreados: respuesta.movimientosCreados,
            },
          },
        };
      },
      { maxWait: 10000, timeout: 60000 },
    );
  } catch (err) {
    return traducirErrorPrisma(err, "Error de base de datos al procesar el desembolso");
  }
};

export default {
  procesarPagoCuotas,
  procesarDesembolso,
};
