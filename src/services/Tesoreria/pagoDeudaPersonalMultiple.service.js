import prisma from "../../config/prismaClient.js";
import {
  NotFoundError,
  DatabaseError,
  ValidationError,
} from "../../utils/errors.js";
import correlativoService from "./correlativoOperacionCaja.service.js";
import periodoContableService from "../Contabilidad/periodoContable.service.js";
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";
import { ESTADO_ASIENTO_CONTABLE } from "../../utils/estados.constants.js";
import { entidadDeBanco } from "../../utils/entidadBanco.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: PAGO MÚLTIPLE (ESPECIALIZADO) DE DEUDAS CON PERSONAL
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Paga varias DeudaConPersonal (de una o varias personas) con UN solo egreso.
 * Autónomo a propósito (mismo criterio que atenderAsignacion.service.js): no
 * toca pagoDeudaPersonal.service.js, que está en producción.
 *
 * Una sola transacción atómica:
 *   1. MovimientoCaja consolidado (egreso) + ITF + comisión, con saldo en cascada
 *   2. Un PagoDeudaPersonal por deuda (monto repartido proporcionalmente al saldo)
 *   3. Actualización de montoPagado / saldoPendiente / estado de cada deuda
 *   4. Asientos contables (si uno falla se revierte toda la operación)
 *
 * Reparto: monto × (saldo de la deuda ÷ suma de saldos), en céntimos con el
 * método del mayor resto. Garantiza que la suma sea EXACTAMENTE el monto pagado
 * y que ninguna deuda reciba más que su saldo.
 *
 * Convención copiada de atenderAsignacion.service.js:
 *   - Egreso principal: la cuenta bancaria va en cuentaCorrienteDestinoId.
 *   - ITF y comisión:   la cuenta bancaria va en cuentaCorrienteOrigenId.
 *   - No se bloquea por saldo insuficiente (el formulario solo advierte).
 *
 * Asiento (referencia: asientos-contables-referencia.json, "PLANILLA - *"):
 *   DEBE  = TipoDeudaPersonal.cuentaContableId (una línea por cuenta distinta;
 *           p. ej. 411101 sueldos, 411401 gratificaciones, 417103 AFP Integra…).
 *           Es dinámico: cada tipo de deuda trae su cuenta, nada hardcodeado.
 *   HABER = CuentaCorriente.cuentaContableId (banco del egreso)
 *   Glosa = "PAGO DE {tipo(s) de deuda} MES DE {mes(es) de la deuda}"
 */

// ════════════════════════════════════════════════════════════
// CONSTANTES (mismos valores que pagoDeudaPersonal / atenderAsignacion)
// ════════════════════════════════════════════════════════════
const ESTADOS_DEUDA = {
  PENDIENTE: 114,
  PAGO_PARCIAL: 115,
  PAGADO: 116,
  VENCIDO: 117,
  ANULADO: 118,
  CANJEADO: 119,
};

const ESTADO_MOVIMIENTO_CAJA_VALIDADO = 21;
// ITF y comisión comparten el mismo tipo de movimiento
const TIPO_MOVIMIENTO_ITF_COMISION = 163;
const MONEDA_NACIONAL_ID = 1;
// Submódulo origen del motivo de la operación: Deudas con Personal
const SUBMODULO_ORIGEN_DEUDAS_PERSONAL_ID = 136;

const CODIGOS_CUENTAS_CONTABLES = {
  ITF: "641101",
  COMISIONES_BANCARIAS: "679401",
};

const MESES = [
  "ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO",
  "JULIO", "AGOSTO", "SETIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE",
];

// ════════════════════════════════════════════════════════════
// HELPERS NUMÉRICOS
// ════════════════════════════════════════════════════════════
const aCentimos = (valor) => BigInt(Math.round(Number(valor) * 100));
const deCentimos = (centimos) => Number(centimos) / 100;
const redondear2 = (valor) => Math.round(Number(valor) * 100) / 100;

/**
 * Reparte `totalCent` entre los saldos de forma proporcional (método del mayor resto).
 * Los céntimos sobrantes van a las deudas con mayor resto; como el total nunca supera
 * la suma de saldos, ninguna deuda recibe más que su saldo.
 */
const repartirProporcional = (saldosCent, totalCent) => {
  const sumaSaldos = saldosCent.reduce((acc, s) => acc + s, 0n);
  const partes = saldosCent.map((s) => (totalCent * s) / sumaSaldos);
  const restos = saldosCent.map((s) => (totalCent * s) % sumaSaldos);

  let faltante = totalCent - partes.reduce((acc, p) => acc + p, 0n);
  const orden = restos
    .map((resto, indice) => ({ resto, indice }))
    .sort((a, b) => (a.resto === b.resto ? a.indice - b.indice : a.resto > b.resto ? -1 : 1));

  for (const { indice } of orden) {
    if (faltante <= 0n) break;
    partes[indice] += 1n;
    faltante -= 1n;
  }
  return partes;
};

// ════════════════════════════════════════════════════════════
// HELPERS DE CAJA (copiados de atenderAsignacion.service.js)
// ════════════════════════════════════════════════════════════
const actualizarSaldoCuentaCorriente = async ({
  tx,
  cuentaCorrienteId,
  empresaId,
  fecha,
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
      ingresos: 0,
      egresos: Number(egresos),
      saldoActual: saldoAnterior - Number(egresos),
      movimientoCajaId: Number(movimientoCajaId),
      centroCostoId: null,
      conciliado: false,
    },
  });
};

const registrarMovimientoEgreso = async ({
  tx,
  data,
  cuenta,
  saldoAnteriorManual = null,
}) => {
  const movimiento = await tx.movimientoCaja.create({ data });

  const registroSaldo = await actualizarSaldoCuentaCorriente({
    tx,
    cuentaCorrienteId: cuenta.id,
    empresaId: cuenta.empresaId,
    fecha: data.fechaOperacionMovCaja,
    egresos: data.monto,
    movimientoCajaId: movimiento.id,
    saldoAnteriorManual,
  });

  return { movimiento, saldoActual: Number(registroSaldo.saldoActual) };
};

const obtenerCuentaGasto = async (tx, codigoCuenta) => {
  const cuenta = await tx.planCuentasContable.findFirst({
    where: { codigoCuenta },
  });
  if (!cuenta) {
    throw new NotFoundError(`No se encontró la cuenta contable ${codigoCuenta}`);
  }
  if (!cuenta.centroCostoId) {
    throw new ValidationError(
      `La cuenta contable ${codigoCuenta} no tiene centro de costo asignado`,
    );
  }
  return cuenta;
};

// ════════════════════════════════════════════════════════════
// HELPER: ASIENTO CONTABLE (N líneas al DEBE, 1 línea al HABER)
// ════════════════════════════════════════════════════════════
/**
 * Variante de crearAsientoDeMovimiento (atenderAsignacion) que admite varias
 * líneas al DEBE: un pago múltiple puede afectar varias cuentas 41.x a la vez.
 * Los asientos siempre se registran en soles.
 *
 * @param {Array<{cuentaId, monto, centroCostoId?}>} lineasDebe - montos en moneda del movimiento
 */
const crearAsiento = async ({
  tx,
  movimiento,
  periodoContable,
  submodulo,
  estadoPendiente,
  lineasDebe,
  cuentaHaberId,
  glosa,
  numeroDocumentoOrigen = null,
  esGerencial,
  tipoCambio,
  esMonedaNacional,
  creadoPor,
}) => {
  const empresaId = Number(movimiento.empresaId);
  const montoOriginal = Number(movimiento.monto);
  const aSoles = (monto) =>
    esMonedaNacional ? redondear2(monto) : redondear2(monto * tipoCambio);
  const haberSoles = aSoles(montoOriginal);

  // Convertir cada línea a soles y absorber la diferencia de redondeo en la última
  const debesSoles = lineasDebe.map((l) => aSoles(l.monto));
  const diferencia = redondear2(haberSoles - debesSoles.reduce((a, b) => a + b, 0));
  debesSoles[debesSoles.length - 1] = redondear2(
    debesSoles[debesSoles.length - 1] + diferencia,
  );

  const ultimoAsiento = await tx.asientoContable.findFirst({
    where: { empresaId, periodoContableId: Number(periodoContable.id) },
    orderBy: { correlativo: "desc" },
  });
  const correlativo = ultimoAsiento ? Number(ultimoAsiento.correlativo) + 1 : 1;
  const numeroAsiento = `ASI-${new Date().getFullYear()}-${String(correlativo).padStart(6, "0")}`;

  const lineaBase = {
    glosa,
    monedaId: MONEDA_NACIONAL_ID,
    tipoCambio,
    entidadComercialId: null,
    tipoDocumentoOrigenId: null,
    numeroDocumentoOrigen,
    fechaDocumentoOrigen: movimiento.fechaOperacionMovCaja,
    fechaVenceDocumentoOrigen: null,
    submoduloOrigenLineaId: submodulo.id,
    procesoOrigenLineaId: movimiento.id,
    creadoPor,
  };

  const detallesDebe = lineasDebe.map((linea, i) => ({
    ...lineaBase,
    numeroLinea: i + 1,
    planCuentaId: linea.cuentaId,
    debe: debesSoles[i],
    haber: 0,
    debeMonedaExtranjera: esMonedaNacional ? null : redondear2(linea.monto),
    haberMonedaExtranjera: null,
    centroCostoId: linea.centroCostoId ?? null,
  }));

  return await tx.asientoContable.create({
    data: {
      empresaId,
      periodoContableId: Number(periodoContable.id),
      numeroAsiento,
      correlativo,
      fechaAsiento: movimiento.fechaOperacionMovCaja,
      glosa,
      tipoLibro: esGerencial ? "GERENCIAL" : "FISCAL",
      tipoLibroId: TIPO_LIBRO.CAJA_BANCOS,
      esGerencial: Boolean(esGerencial),
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
          ...detallesDebe,
          {
            ...lineaBase,
            numeroLinea: detallesDebe.length + 1,
            planCuentaId: cuentaHaberId,
            debe: 0,
            haber: haberSoles,
            debeMonedaExtranjera: null,
            haberMonedaExtranjera: esMonedaNacional ? null : montoOriginal,
            centroCostoId: null,
          },
        ],
      },
    },
    include: { moneda: true, empresa: true },
  });
};

// ════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL
// ════════════════════════════════════════════════════════════
/**
 * @param {Object} datos
 * @param {Array<number>} datos.deudaIds - DeudaConPersonal a pagar (una o varias personas)
 * @param {number} datos.montoPago - Monto total pagado (≤ suma de saldos)
 * @param {Array<{deudaId:number, monto:number}>} [datos.montosPorDeuda] - Monto manual por deuda
 *   (opcional). Debe incluir todas las deudas, cada monto ≤ su saldo y la suma = montoPago.
 *   Si no viene, el monto se reparte proporcionalmente al saldo.
 * @param {string|Date} datos.fechaPago
 * @param {number} datos.cuentaCorrienteOrigenId - Cuenta bancaria de donde sale el dinero
 * @param {number} datos.medioPagoId
 * @param {number} datos.tipoMovimientoId - Tipo de movimiento del egreso consolidado
 * @param {number} datos.entidadComercialId - Entidad destino (OBLIGATORIA, también con 1 persona)
 * @param {string} [datos.numeroOperacion]
 * @param {string} [datos.numeroCheque]
 * @param {string} [datos.descripcion] - Glosa; si no viene se arma automáticamente
 * @param {string} [datos.observaciones]
 * @param {number} [datos.itf=0]
 * @param {number} [datos.comision=0]
 * @param {number} [datos.tipoCambio] - Solo si la moneda de las deudas no es soles
 * @param {number} datos.usuarioId
 */
const procesarPagoMultiple = async (datos) => {
  const {
    deudaIds,
    fechaPago,
    cuentaCorrienteOrigenId,
    medioPagoId,
    tipoMovimientoId,
    entidadComercialId,
    numeroOperacion,
    numeroCheque,
    observaciones,
    usuarioId,
  } = datos;

  try {
    // ════════════════════════════════════════════════════════════
    // 0. VALIDACIONES DE ENTRADA
    // ════════════════════════════════════════════════════════════
    if (!Array.isArray(deudaIds) || deudaIds.length === 0) {
      throw new ValidationError("Debe seleccionar al menos una deuda");
    }
    const idsUnicos = [...new Set(deudaIds.map((id) => Number(id)))];
    if (idsUnicos.some((id) => !Number.isInteger(id) || id <= 0)) {
      throw new ValidationError("La lista de deudas contiene identificadores inválidos");
    }
    if (!fechaPago || !cuentaCorrienteOrigenId || !medioPagoId || !tipoMovimientoId) {
      throw new ValidationError(
        "La fecha, la cuenta corriente, el medio de pago y el tipo de movimiento son obligatorios",
      );
    }
    // Siempre obligatoria: con una persona el frontend la preselecciona desde
    // Personal.enlaceEntidadComercialId; con varias (p. ej. AFP) la elige el usuario.
    if (!entidadComercialId) {
      throw new ValidationError(
        "La entidad destino es obligatoria. Si es una sola persona, asígnele su entidad comercial en Personal.",
      );
    }

    const montoPago = Number(datos.montoPago);
    if (!Number.isFinite(montoPago) || montoPago <= 0) {
      throw new ValidationError("El monto del pago debe ser mayor a cero");
    }
    const itf = Number(datos.itf || 0);
    const comision = Number(datos.comision || 0);
    if (itf < 0) throw new ValidationError("El ITF no puede ser negativo.");
    if (comision < 0) throw new ValidationError("La comisión no puede ser negativa.");

    const resultado = await prisma.$transaction(async (tx) => {
      // ════════════════════════════════════════════════════════════
      // 1. VALIDAR DEUDAS
      // ════════════════════════════════════════════════════════════
      const deudas = await tx.deudaConPersonal.findMany({
        where: { id: { in: idsUnicos.map((id) => BigInt(id)) } },
        include: {
          personal: { select: { id: true, nombres: true, apellidos: true } },
          tipoDeuda: { select: { id: true, nombre: true, cuentaContableId: true } },
        },
        orderBy: { id: "asc" },
      });

      if (deudas.length !== idsUnicos.length) {
        throw new NotFoundError("Alguna de las deudas seleccionadas no existe");
      }

      for (const d of deudas) {
        if ([ESTADOS_DEUDA.ANULADO, ESTADOS_DEUDA.CANJEADO].includes(Number(d.estadoId))) {
          throw new ValidationError(`La deuda ${d.id} está anulada o canjeada y no puede pagarse`);
        }
        if (Number(d.saldoPendiente) <= 0) {
          throw new ValidationError(`La deuda ${d.id} ya está completamente pagada`);
        }
      }

      const base = deudas[0];
      const mismaEmpresa = deudas.every((d) => Number(d.empresaId) === Number(base.empresaId));
      const mismaMoneda = deudas.every((d) => Number(d.monedaId) === Number(base.monedaId));
      const mismoLibro = deudas.every((d) => Boolean(d.esGerencial) === Boolean(base.esGerencial));
      if (!mismaEmpresa) throw new ValidationError("Las deudas deben ser de la misma empresa");
      if (!mismaMoneda) throw new ValidationError("Las deudas deben estar en la misma moneda");
      if (!mismoLibro) {
        throw new ValidationError(
          "No se pueden mezclar deudas gerenciales con deudas formales en un mismo pago",
        );
      }

      const empresaId = Number(base.empresaId);
      const esGerencial = Boolean(base.esGerencial);
      const esMonedaNacional = Number(base.monedaId) === MONEDA_NACIONAL_ID;
      const tc = esMonedaNacional ? 1 : Number(datos.tipoCambio);
      if (!esMonedaNacional && !(tc > 0)) {
        throw new ValidationError(
          "Debe proporcionar el tipo de cambio para deudas en moneda extranjera",
        );
      }

      // ════════════════════════════════════════════════════════════
      // 2. MONTO Y REPARTO PROPORCIONAL
      // ════════════════════════════════════════════════════════════
      const saldosCent = deudas.map((d) => aCentimos(d.saldoPendiente));
      const totalCent = aCentimos(montoPago);
      const sumaSaldosCent = saldosCent.reduce((acc, s) => acc + s, 0n);
      if (totalCent > sumaSaldosCent) {
        throw new ValidationError(
          `El monto del pago (${montoPago}) no puede ser mayor a la suma de saldos (${deCentimos(sumaSaldosCent)})`,
        );
      }

      // Reparto: manual por deuda (si el usuario indicó el monto de cada una) o proporcional al saldo
      let partesCent;
      if (Array.isArray(datos.montosPorDeuda) && datos.montosPorDeuda.length > 0) {
        const montoPorDeudaId = new Map();
        for (const item of datos.montosPorDeuda) {
          const deudaId = Number(item?.deudaId);
          const monto = Number(item?.monto);
          if (!idsUnicos.includes(deudaId) || montoPorDeudaId.has(deudaId)) {
            throw new ValidationError("El detalle de montos contiene una deuda no seleccionada o repetida");
          }
          if (!Number.isFinite(monto) || monto < 0) {
            throw new ValidationError(`El monto de la deuda ${deudaId} es inválido`);
          }
          montoPorDeudaId.set(deudaId, aCentimos(monto));
        }
        if (montoPorDeudaId.size !== idsUnicos.length) {
          throw new ValidationError("Debe indicar el monto a pagar de cada deuda seleccionada");
        }
        partesCent = deudas.map((d, i) => {
          const parteCent = montoPorDeudaId.get(Number(d.id));
          if (parteCent > saldosCent[i]) {
            throw new ValidationError(
              `El monto de la deuda ${d.id} (${deCentimos(parteCent)}) no puede ser mayor a su saldo (${deCentimos(saldosCent[i])})`,
            );
          }
          return parteCent;
        });
        const sumaPartesCent = partesCent.reduce((acc, p) => acc + p, 0n);
        if (sumaPartesCent !== totalCent) {
          throw new ValidationError(
            `El monto del pago (${montoPago}) no coincide con la suma de los montos por deuda (${deCentimos(sumaPartesCent)})`,
          );
        }
      } else {
        partesCent = repartirProporcional(saldosCent, totalCent);
      }

      // ════════════════════════════════════════════════════════════
      // 3. VALIDAR CUENTA, MEDIO DE PAGO, TIPO DE MOVIMIENTO Y ENTIDAD
      // ════════════════════════════════════════════════════════════
      const cuenta = await tx.cuentaCorriente.findUnique({
        where: { id: Number(cuentaCorrienteOrigenId) },
        include: { banco: { select: { id: true, enlaceEntidadComercialId: true } } },
      });
      if (!cuenta) throw new NotFoundError("Cuenta corriente no encontrada.");
      if (Number(cuenta.empresaId) !== empresaId) {
        throw new ValidationError("La cuenta corriente no pertenece a la empresa de las deudas");
      }
      if (Number(cuenta.monedaId) !== Number(base.monedaId)) {
        throw new ValidationError("La moneda de la cuenta corriente no coincide con la de las deudas");
      }
      if (!cuenta.cuentaContableId) {
        throw new ValidationError("La cuenta corriente no tiene cuenta contable asociada");
      }
      // No se valida saldo a propósito: solo se advierte en el formulario.

      const [medioPago, tipoMovimiento, entidad] = await Promise.all([
        tx.medioPago.findUnique({ where: { id: Number(medioPagoId) } }),
        tx.tipoMovEntregaRendir.findFirst({
          where: { id: Number(tipoMovimientoId), activo: true },
        }),
        tx.entidadComercial.findUnique({ where: { id: Number(entidadComercialId) } }),
      ]);
      if (!medioPago) throw new NotFoundError("Medio de pago no encontrado.");
      if (!tipoMovimiento) throw new NotFoundError("Tipo de movimiento no encontrado o inactivo.");
      if (!entidad) throw new NotFoundError("Entidad destino no encontrada.");

      // ════════════════════════════════════════════════════════════
      // 4. DATOS CONTABLES (cuenta DEBE por tipo de deuda, submódulos, estado)
      // ════════════════════════════════════════════════════════════
      const tiposSinCuenta = [
        ...new Set(deudas.filter((d) => !d.tipoDeuda.cuentaContableId).map((d) => d.tipoDeuda.nombre)),
      ];
      if (tiposSinCuenta.length > 0) {
        throw new ValidationError(
          `Los siguientes tipos de deuda no tienen cuenta contable configurada: ${tiposSinCuenta.join(", ")}`,
        );
      }

      const [submoduloMovCaja, estadoAsientoPendiente] = await Promise.all([
        tx.submoduloSistema.findFirst({
          where: { nombreModeloOrigen: "MovimientoCaja", activo: true },
        }),
        tx.estadoMultiFuncion.findFirst({
          where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
        }),
      ]);
      if (!submoduloMovCaja) {
        throw new ValidationError('No se encontró el submódulo "MovimientoCaja"');
      }
      if (!estadoAsientoPendiente) {
        throw new ValidationError("No se encontró el estado PENDIENTE para asientos contables");
      }

      // Las cuentas de gasto solo se exigen si hay ITF / comisión
      const cuentaGastoITF =
        itf > 0 ? await obtenerCuentaGasto(tx, CODIGOS_CUENTAS_CONTABLES.ITF) : null;
      const cuentaGastoComision =
        comision > 0
          ? await obtenerCuentaGasto(tx, CODIGOS_CUENTAS_CONTABLES.COMISIONES_BANCARIAS)
          : null;

      const fechaContable = new Date(fechaPago);
      const correlativo = await correlativoService.generarCorrelativo(empresaId, tx);
      const periodoContable = await periodoContableService.obtenerPeriodoPorFecha(
        empresaId,
        fechaContable,
      );

      // ════════════════════════════════════════════════════════════
      // 5. GLOSA: "PAGO DE {tipos} MES DE {meses}" (mes = fecha de la deuda)
      // ════════════════════════════════════════════════════════════
      const tiposTexto = [...new Set(deudas.map((d) => d.tipoDeuda.nombre.toUpperCase()))].join(" / ");
      const mesesTexto = [...new Set(deudas.map((d) => MESES[new Date(d.fecha).getUTCMonth()]))].join(" / ");
      let descripcionMovimiento =
        (datos.descripcion && String(datos.descripcion).trim()) ||
        `PAGO DE ${tiposTexto} MES DE ${mesesTexto}`;
      if (numeroCheque) descripcionMovimiento += ` N° CHEQUE: ${numeroCheque}`;

      // ════════════════════════════════════════════════════════════
      // 6. MOVIMIENTOS DE CAJA (EGRESO CONSOLIDADO + ITF + COMISIÓN) Y SALDOS EN CASCADA
      // ════════════════════════════════════════════════════════════
      const baseMovimiento = {
        refOperacionEspecializadaMovCaja: correlativo,
        empresaId,
        monedaId: base.monedaId,
        medioPagoId: Number(medioPagoId),
        fechaOperacionMovCaja: fechaContable,
        estadoId: ESTADO_MOVIMIENTO_CAJA_VALIDADO,
        esGerencial,
        tipoCambio: tc,
        usuarioId: usuarioId ? Number(usuarioId) : null,
        // Un pago múltiple no tiene un único registro origen (hay N deudas/pagos):
        // por eso no se informa origenMotivoOperacionId; el vínculo es el correlativo.
        moduloOrigenMotivoOperacionId: SUBMODULO_ORIGEN_DEUDAS_PERSONAL_ID,
        fechaMotivoOperacion: new Date(),
        usuarioMotivoOperacionId: usuarioId ? Number(usuarioId) : null,
      };

      const egreso = await registrarMovimientoEgreso({
        tx,
        cuenta,
        data: {
          ...baseMovimiento,
          tipoMovimientoId: tipoMovimiento.id,
          entidadComercialId: entidad.id,
          monto: montoPago,
          cuentaCorrienteDestinoId: cuenta.id,
          descripcion: descripcionMovimiento,
          numeroOperacionPagoBanco: numeroOperacion || null,
          fechaOperacionPagoBanco: fechaContable,
        },
      });

      const itfRegistro =
        itf > 0
          ? await registrarMovimientoEgreso({
              tx,
              cuenta,
              saldoAnteriorManual: egreso.saldoActual,
              data: {
                ...baseMovimiento,
                // ITF: lo cobra el banco de la cuenta (null si el banco no tiene entidad enlazada)
                entidadComercialId: entidadDeBanco(cuenta.banco),
                tipoMovimientoId: TIPO_MOVIMIENTO_ITF_COMISION,
                monto: itf,
                cuentaCorrienteOrigenId: cuenta.id,
                descripcion: `ITF - ${descripcionMovimiento}`,
              },
            })
          : null;

      const comisionRegistro =
        comision > 0
          ? await registrarMovimientoEgreso({
              tx,
              cuenta,
              // ?? y no ||: un saldo de 0 es válido y no debe retroceder al saldo anterior
              saldoAnteriorManual: itfRegistro?.saldoActual ?? egreso.saldoActual,
              data: {
                ...baseMovimiento,
                // Comisión: la cobra el banco de la cuenta (null si el banco no tiene entidad enlazada)
                entidadComercialId: entidadDeBanco(cuenta.banco),
                tipoMovimientoId: TIPO_MOVIMIENTO_ITF_COMISION,
                monto: comision,
                cuentaCorrienteOrigenId: cuenta.id,
                descripcion: `Comisión - ${descripcionMovimiento}`,
              },
            })
          : null;

      // ════════════════════════════════════════════════════════════
      // 7. PAGO POR DEUDA + ACTUALIZACIÓN DE SALDO Y ESTADO
      // ════════════════════════════════════════════════════════════
      const distribucion = [];
      const montoPorCuentaDebe = new Map(); // cuentaContableId -> monto (moneda de la deuda)

      for (let i = 0; i < deudas.length; i++) {
        const deuda = deudas[i];
        const parteCent = partesCent[i];
        if (parteCent <= 0n) continue; // pago parcial muy pequeño: esta deuda no recibe nada

        const montoAplicado = deCentimos(parteCent);
        const nuevoSaldoCent = saldosCent[i] - parteCent;
        const nuevoSaldo = deCentimos(nuevoSaldoCent);
        const nuevoMontoPagado = redondear2(Number(deuda.montoPagado) + montoAplicado);
        const nuevoEstadoId =
          nuevoSaldoCent === 0n ? ESTADOS_DEUDA.PAGADO : ESTADOS_DEUDA.PAGO_PARCIAL;

        // Anti doble pago: solo actualiza si el saldo no cambió desde que se leyó
        const reclamo = await tx.deudaConPersonal.updateMany({
          where: { id: deuda.id, saldoPendiente: deuda.saldoPendiente },
          data: {
            montoPagado: nuevoMontoPagado,
            saldoPendiente: nuevoSaldo,
            estadoId: nuevoEstadoId,
            actualizadoPor: usuarioId ? Number(usuarioId) : null,
          },
        });
        if (reclamo.count !== 1) {
          throw new ValidationError(
            `La deuda ${deuda.id} fue modificada por otro usuario. Recargue e intente nuevamente.`,
          );
        }

        const pago = await tx.pagoDeudaPersonal.create({
          data: {
            deudaConPersonalId: deuda.id,
            fechaPago: fechaContable,
            montoPago: montoAplicado,
            medioPagoId: Number(medioPagoId),
            numeroOperacion: numeroOperacion || null,
            movimientoCajaId: egreso.movimiento.id,
            observaciones: observaciones || null,
            creadoPor: usuarioId ? Number(usuarioId) : null,
            refOperacionEspecializadaMovCaja: correlativo,
            // Control de cierre contable: mismo período que usan los asientos de esta operación
            fechaContable,
            periodoContableId: periodoContable.id,
          },
        });

        const cuentaDebeId = String(deuda.tipoDeuda.cuentaContableId);
        montoPorCuentaDebe.set(
          cuentaDebeId,
          redondear2((montoPorCuentaDebe.get(cuentaDebeId) || 0) + montoAplicado),
        );

        distribucion.push({
          deudaId: deuda.id,
          pagoId: pago.id,
          personal: `${deuda.personal.nombres} ${deuda.personal.apellidos}`.trim(),
          tipoDeuda: deuda.tipoDeuda.nombre,
          montoAplicado,
          nuevoSaldo,
          nuevoEstadoId,
        });
      }

      // ════════════════════════════════════════════════════════════
      // 8. ASIENTOS CONTABLES (si uno falla, se revierte toda la operación)
      // ════════════════════════════════════════════════════════════
      const paramsAsiento = {
        tx,
        periodoContable,
        submodulo: submoduloMovCaja,
        estadoPendiente: estadoAsientoPendiente,
        cuentaHaberId: cuenta.cuentaContableId,
        esGerencial,
        tipoCambio: tc,
        esMonedaNacional,
        creadoPor: usuarioId,
      };

      const asientos = [];

      // Egreso consolidado: DEBE = una línea por cuenta 41.x del tipo de deuda
      asientos.push(
        await crearAsiento({
          ...paramsAsiento,
          movimiento: egreso.movimiento,
          lineasDebe: [...montoPorCuentaDebe.entries()].map(([cuentaId, monto]) => ({
            cuentaId: BigInt(cuentaId),
            monto,
          })),
          glosa: descripcionMovimiento,
          numeroDocumentoOrigen: numeroOperacion || null,
        }),
      );

      if (itfRegistro) {
        asientos.push(
          await crearAsiento({
            ...paramsAsiento,
            movimiento: itfRegistro.movimiento,
            lineasDebe: [
              { cuentaId: cuentaGastoITF.id, monto: itf, centroCostoId: cuentaGastoITF.centroCostoId },
            ],
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
                cuentaId: cuentaGastoComision.id,
                monto: comision,
                centroCostoId: cuentaGastoComision.centroCostoId,
              },
            ],
            glosa: `POR LA COMISION - ${descripcionMovimiento}`,
          }),
        );
      }

      const movimientos = [
        egreso.movimiento,
        itfRegistro?.movimiento,
        comisionRegistro?.movimiento,
      ].filter(Boolean);

      await tx.movimientoCaja.updateMany({
        where: { id: { in: movimientos.map((m) => m.id) } },
        data: { asientosGenerados: true },
      });

      // ════════════════════════════════════════════════════════════
      // 9. RESPUESTA (misma forma que atenderAsignacion, para reutilizar vouchers y confirmación)
      // ════════════════════════════════════════════════════════════
      const movimientosCompletos = await tx.movimientoCaja.findMany({
        where: { id: { in: movimientos.map((m) => m.id) } },
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
      const movimientosMap = {};
      movimientosCompletos.forEach((m) => {
        movimientosMap[m.id.toString()] = m;
      });

      const etiquetasSaldo = {
        [egreso.movimiento.id]: "Egreso",
        ...(itfRegistro && { [itfRegistro.movimiento.id]: "ITF Origen" }),
        ...(comisionRegistro && { [comisionRegistro.movimiento.id]: "Comisión Origen" }),
      };
      const saldos = await tx.saldoCuentaCorriente.findMany({
        where: { movimientoCajaId: { in: movimientos.map((m) => m.id) } },
        orderBy: { fecha: "asc" },
      });
      const saldosCuentaCorriente = saldos
        .filter((s) => etiquetasSaldo[s.movimientoCajaId.toString()])
        .map((s) => ({
          tipo: etiquetasSaldo[s.movimientoCajaId.toString()],
          movimientoCajaId: s.movimientoCajaId,
          saldoAnterior: Number(s.saldoAnterior),
          ingresos: Number(s.ingresos),
          egresos: Number(s.egresos),
          saldoActual: Number(s.saldoActual),
        }));

      const saldoFinalCuenta = comisionRegistro?.saldoActual ?? itfRegistro?.saldoActual ?? egreso.saldoActual;

      return {
        success: true,
        message: `Pago de ${distribucion.length} deuda(s) registrado exitosamente`,
        data: {
        correlativo: Number(correlativo),
        movimientoEgresoId: egreso.movimiento.id,
        movimientoITFOrigenId: itfRegistro?.movimiento.id || null,
        movimientoComisionOrigenId: comisionRegistro?.movimiento.id || null,
        movimientos: {
          egreso: movimientosMap[egreso.movimiento.id.toString()] || null,
          itfOrigen: itfRegistro ? movimientosMap[itfRegistro.movimiento.id.toString()] : null,
          comisionOrigen: comisionRegistro
            ? movimientosMap[comisionRegistro.movimiento.id.toString()]
            : null,
        },
        saldosCuentaCorriente,
        asientosContables: asientos,
        distribucion,
        resumen: {
          deudasPagadas: distribucion.length,
          montoPagado: montoPago,
          itf,
          comision,
          totalDescontado: redondear2(montoPago + itf + comision),
          saldoFinalCuenta,
          movimientosCreados: 1 + (itfRegistro ? 1 : 0) + (comisionRegistro ? 1 : 0),
        },
        },
      };
    });

    return resultado;
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos al procesar el pago múltiple", err.message);
    }
    throw err;
  }
};

// ════════════════════════════════════════════════════════════
// SINCRONIZACIÓN DE ADJUNTOS DE LA OPERACIÓN
// ════════════════════════════════════════════════════════════
/**
 * Una operación de pago múltiple genera N PagoDeudaPersonal, pero el sistema PDF guarda
 * el archivo solo en el registro del entityId (el primer pago). Esta función copia las URLs
 * del voucher consolidado y del comprobante de la entidad recaudadora a los demás pagos
 * de la misma operación, de modo que cada deuda pagada muestre los mismos adjuntos.
 *
 * Los pagos se agrupan por refOperacionEspecializadaMovCaja (correlativo de la empresa),
 * por eso también se filtra por empresa: el mismo número puede repetirse entre empresas.
 * Se copian ambos campos tal como están en el pago de origen (incluye null si se eliminó).
 *
 * @param {number|bigint} pagoId - Pago que recibió el archivo (origen de la copia)
 */
const sincronizarAdjuntosOperacion = async (pagoId) => {
  try {
    const origen = await prisma.pagoDeudaPersonal.findUnique({
      where: { id: BigInt(pagoId) },
      select: {
        id: true,
        refOperacionEspecializadaMovCaja: true,
        urlVoucherOperacionConsolidado: true,
        urlComprobanteOperacion: true,
        deudaConPersonal: { select: { empresaId: true } },
      },
    });

    if (!origen) throw new NotFoundError("Pago de deuda personal no encontrado");

    // Pagos antiguos sin operación asociada: no hay hermanos que sincronizar
    if (!origen.refOperacionEspecializadaMovCaja) {
      return { success: true, actualizados: 0 };
    }

    const { count } = await prisma.pagoDeudaPersonal.updateMany({
      where: {
        id: { not: origen.id },
        refOperacionEspecializadaMovCaja: origen.refOperacionEspecializadaMovCaja,
        deudaConPersonal: { empresaId: origen.deudaConPersonal.empresaId },
      },
      data: {
        urlVoucherOperacionConsolidado: origen.urlVoucherOperacionConsolidado,
        urlComprobanteOperacion: origen.urlComprobanteOperacion,
      },
    });

    return { success: true, actualizados: count };
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError("Error de base de datos al sincronizar adjuntos", err.message);
    }
    throw err;
  }
};

export default {
  procesarPagoMultiple,
  sincronizarAdjuntosOperacion,
};
