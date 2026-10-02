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

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: ATENCIÓN DE ASIGNACIONES (ENTREGA A RENDIR) DESDE TESORERÍA
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Autónomo a propósito: las reglas del Flujo 3 (egreso directo) de
 * transferenciaInterna.service.js se COPIARON aquí para no tocar ese servicio,
 * que está en producción. Si se corrige algo allá, evaluar si aplica aquí.
 *
 * Una sola transacción atómica:
 *   1. Egreso principal  → asiento DEBE 141301/141302  HABER cuenta bancaria
 *   2. ITF (si > 0)      → asiento DEBE 641101         HABER cuenta bancaria
 *   3. Comisión (si > 0) → asiento DEBE 679401         HABER cuenta bancaria
 *   4. Actualiza la asignación (DetMovsEntregaRendir)
 *
 * Convención copiada de la transferencia:
 *   - Egreso principal: la cuenta bancaria va en cuentaCorrienteDestinoId.
 *   - ITF y comisión:   la cuenta bancaria va en cuentaCorrienteOrigenId.
 *
 * A diferencia de la transferencia, si falla un asiento se revierte TODA la
 * operación: una entrega de dinero sin asiento sería un descuadre silencioso.
 */

// ════════════════════════════════════════════════════════════
// CONSTANTES (mismos valores que transferenciaInterna.service.js)
// ════════════════════════════════════════════════════════════
const ESTADO_MOVIMIENTO_CAJA_VALIDADO = 21;

// ITF y comisión comparten el mismo tipo de movimiento
const TIPO_MOVIMIENTO_ITF_COMISION = 163;

const MONEDA_NACIONAL_ID = 1;

const CODIGOS_CUENTAS_CONTABLES = {
  ITF: "641101",
  COMISIONES_BANCARIAS: "679401",
  // Entregas a rendir cuenta de personal (patrón de detMovsEntregaRendir.service.js)
  ENTREGAS_RENDIR_MN: "141301",
  ENTREGAS_RENDIR_ME: "141302",
};

// ════════════════════════════════════════════════════════════
// HELPER: ACTUALIZAR SALDO DE CUENTA CORRIENTE
// ════════════════════════════════════════════════════════════
/**
 * Copiado de transferenciaInterna.service.js. Se omite la conversión de moneda
 * porque aquí la cuenta y la asignación siempre tienen la misma moneda
 * (se valida antes de operar).
 */
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

// ════════════════════════════════════════════════════════════
// HELPER: MOVIMIENTO DE CAJA (EGRESO) + SU SALDO
// ════════════════════════════════════════════════════════════
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

// ════════════════════════════════════════════════════════════
// HELPER: ASIENTO CONTABLE DE UN MOVIMIENTO (misma estructura que la transferencia)
// ════════════════════════════════════════════════════════════
const crearAsientoDeMovimiento = async ({
  tx,
  movimiento,
  periodoContable,
  submodulo,
  estadoPendiente,
  cuentaDebeId,
  cuentaHaberId,
  glosa,
  centroCostoDebeId = null,
  numeroDocumentoOrigen = null,
  esGerencial,
  tipoCambio,
  esMonedaNacional,
  creadoPor,
}) => {
  const empresaId = Number(movimiento.empresaId);
  const montoOriginal = Number(movimiento.monto);
  // Los asientos siempre se registran en soles
  const montoSoles = esMonedaNacional ? montoOriginal : montoOriginal * tipoCambio;

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
          {
            ...lineaBase,
            numeroLinea: 1,
            planCuentaId: cuentaDebeId,
            debe: montoSoles,
            haber: 0,
            debeMonedaExtranjera: esMonedaNacional ? null : montoOriginal,
            haberMonedaExtranjera: null,
            centroCostoId: centroCostoDebeId,
          },
          {
            ...lineaBase,
            numeroLinea: 2,
            planCuentaId: cuentaHaberId,
            debe: 0,
            haber: montoSoles,
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
// HELPER: CUENTA CONTABLE DE GASTO (ITF / COMISIÓN) CON CENTRO DE COSTO
// ════════════════════════════════════════════════════════════
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
// FUNCIÓN PRINCIPAL
// ════════════════════════════════════════════════════════════
/**
 * @param {Object} datos
 * @param {number} datos.detMovsEntregaRendirId - Asignación a atender
 * @param {number} datos.cuentaCorrienteOrigenId - Cuenta de donde sale el dinero
 * @param {number} datos.medioPagoId
 * @param {string} [datos.numeroCheque]
 * @param {string} [datos.numeroOperacion]
 * @param {string|Date} datos.fechaEntrega
 * @param {string} datos.descripcion - Glosa (obligatoria)
 * @param {number} [datos.itfOrigen=0]
 * @param {number} [datos.comisionOrigen=0]
 * @param {boolean} [datos.esGerencial=false]
 * @param {number} [datos.tipoCambio] - Solo si la asignación no es en soles
 * @param {number} datos.usuarioId
 */
const atenderAsignacion = async (datos) => {
  const {
    detMovsEntregaRendirId,
    cuentaCorrienteOrigenId,
    medioPagoId,
    numeroCheque,
    numeroOperacion,
    fechaEntrega,
    descripcion,
    esGerencial = false,
    tipoCambio,
    usuarioId,
  } = datos;

  try {
    if (!detMovsEntregaRendirId || !cuentaCorrienteOrigenId || !medioPagoId) {
      throw new ValidationError(
        "La asignación, la cuenta corriente y el medio de pago son obligatorios",
      );
    }
    if (!descripcion || !String(descripcion).trim()) {
      throw new ValidationError("La glosa es obligatoria");
    }

    const itf = Number(datos.itfOrigen || 0);
    const comision = Number(datos.comisionOrigen || 0);
    if (itf < 0) throw new ValidationError("El ITF no puede ser negativo.");
    if (comision < 0) {
      throw new ValidationError("La comisión no puede ser negativa.");
    }

    return await prisma.$transaction(async (tx) => {
      // ════════════════════════════════════════════════════════════
      // 1. VALIDAR ASIGNACIÓN
      // ════════════════════════════════════════════════════════════
      const detMov = await tx.detMovsEntregaRendir.findUnique({
        where: { id: BigInt(detMovsEntregaRendirId) },
        include: {
          responsable: { select: { nombres: true, apellidos: true } },
          moneda: { select: { simbolo: true } },
          tipoMovimiento: { select: { nombre: true } },
        },
      });

      if (!detMov) throw new NotFoundError("Asignación no encontrada");
      if (detMov.validadoTesoreria) {
        throw new ValidationError("Esta asignación ya fue atendida");
      }
      if (
        detMov.formaParteCalculoEntregaARendir !== true ||
        detMov.entidadComercialId !== null
      ) {
        throw new ValidationError("Este registro no es una asignación válida");
      }
      if (!detMov.monedaId) {
        throw new ValidationError("La asignación no tiene moneda definida");
      }

      // La entrega es por el monto total asignado: una entrega parcial dejaría
      // la asignación validada y perdería el saldo pendiente.
      const monto = Number(detMov.monto);
      if (datos.monto !== undefined && Number(datos.monto) !== monto) {
        throw new ValidationError(
          `La entrega debe ser por el monto total asignado (${detMov.moneda?.simbolo || ""} ${monto})`,
        );
      }

      // ════════════════════════════════════════════════════════════
      // 2. VALIDAR CUENTA CORRIENTE Y SALDO (monto + ITF + comisión)
      // ════════════════════════════════════════════════════════════
      const cuenta = await tx.cuentaCorriente.findUnique({
        where: { id: Number(cuentaCorrienteOrigenId) },
      });
      if (!cuenta) throw new NotFoundError("Cuenta de origen no encontrada.");

      if (Number(cuenta.monedaId) !== Number(detMov.monedaId)) {
        throw new ValidationError(
          "La moneda de la cuenta corriente no coincide con la de la asignación",
        );
      }
      if (Number(cuenta.empresaId) !== Number(detMov.empresaId)) {
        throw new ValidationError(
          "La cuenta corriente no pertenece a la empresa de la asignación",
        );
      }
      if (!cuenta.cuentaContableId) {
        throw new ValidationError(
          "La cuenta corriente no tiene cuenta contable asociada",
        );
      }

      const totalDebitado = monto + itf + comision;
      const saldoOrigen = await tx.saldoCuentaCorriente.findFirst({
        where: {
          cuentaCorrienteId: cuenta.id,
          empresaId: Number(cuenta.empresaId),
        },
        orderBy: { fecha: "desc" },
      });
      const saldoDisponible = saldoOrigen ? Number(saldoOrigen.saldoActual) : 0;
      if (saldoDisponible < totalDebitado) {
        throw new ValidationError(
          `Saldo insuficiente en cuenta de origen. Disponible: ${saldoDisponible}, Requerido: ${totalDebitado}`,
        );
      }

      const esMonedaNacional = Number(detMov.monedaId) === MONEDA_NACIONAL_ID;
      const tc = esMonedaNacional ? 1 : Number(tipoCambio);
      if (!esMonedaNacional && !(tc > 0)) {
        throw new ValidationError(
          "Debe proporcionar el tipo de cambio para asignaciones en moneda extranjera",
        );
      }

      // ════════════════════════════════════════════════════════════
      // 3. RECLAMAR LA ASIGNACIÓN (anti doble entrega)
      // ════════════════════════════════════════════════════════════
      // Si dos usuarios (o dos clics) atienden a la vez, solo uno logra el reclamo.
      const reclamo = await tx.detMovsEntregaRendir.updateMany({
        where: { id: detMov.id, validadoTesoreria: false },
        data: { validadoTesoreria: true },
      });
      if (reclamo.count !== 1) {
        throw new ValidationError("Esta asignación ya fue atendida");
      }

      // ════════════════════════════════════════════════════════════
      // 4. DATOS DE APOYO (submódulos, estado, cuentas contables)
      // ════════════════════════════════════════════════════════════
      const [submoduloMotivo, submoduloMovCaja, estadoAsientoPendiente] =
        await Promise.all([
          tx.submoduloSistema.findFirst({ where: { ruta: "rendicionGastos" } }),
          tx.submoduloSistema.findFirst({
            where: { nombreModeloOrigen: "MovimientoCaja", activo: true },
          }),
          tx.estadoMultiFuncion.findFirst({
            where: { id: Number(ESTADO_ASIENTO_CONTABLE.PENDIENTE) },
          }),
        ]);

      if (!submoduloMotivo) {
        throw new NotFoundError('Submódulo con ruta "rendicionGastos" no encontrado');
      }
      if (!submoduloMovCaja) {
        throw new ValidationError('No se encontró el submódulo "MovimientoCaja"');
      }
      if (!estadoAsientoPendiente) {
        throw new ValidationError(
          "No se encontró el estado PENDIENTE para asientos contables",
        );
      }

      const codigoEntregasRendir = esMonedaNacional
        ? CODIGOS_CUENTAS_CONTABLES.ENTREGAS_RENDIR_MN
        : CODIGOS_CUENTAS_CONTABLES.ENTREGAS_RENDIR_ME;
      const cuentaEntregasRendir = await tx.planCuentasContable.findFirst({
        where: { codigoCuenta: codigoEntregasRendir, activo: true },
      });
      if (!cuentaEntregasRendir) {
        throw new NotFoundError(
          `Cuenta contable ${codigoEntregasRendir} no encontrada`,
        );
      }

      // Las cuentas de gasto solo se exigen si hay ITF / comisión
      const cuentaGastoITF =
        itf > 0 ? await obtenerCuentaGasto(tx, CODIGOS_CUENTAS_CONTABLES.ITF) : null;
      const cuentaGastoComision =
        comision > 0
          ? await obtenerCuentaGasto(tx, CODIGOS_CUENTAS_CONTABLES.COMISIONES_BANCARIAS)
          : null;

      const fechaContable = fechaEntrega ? new Date(fechaEntrega) : new Date();
      const empresaId = Number(cuenta.empresaId);

      const correlativo = await correlativoService.generarCorrelativo(empresaId, tx);
      const periodoContable = await periodoContableService.obtenerPeriodoPorFecha(
        empresaId,
        fechaContable,
      );

      const nombreResponsable =
        `${detMov.responsable?.nombres || ""} ${detMov.responsable?.apellidos || ""}`.trim();

      let descripcionMovimiento = String(descripcion).trim();
      if (numeroCheque) descripcionMovimiento += ` N° CHEQUE: ${numeroCheque}`;

      // ════════════════════════════════════════════════════════════
      // 5. MOVIMIENTOS DE CAJA (EGRESO + ITF + COMISIÓN) Y SALDOS EN CASCADA
      // ════════════════════════════════════════════════════════════
      const baseMovimiento = {
        refOperacionEspecializadaMovCaja: correlativo,
        empresaId,
        monedaId: detMov.monedaId,
        medioPagoId: Number(medioPagoId),
        fechaOperacionMovCaja: fechaContable,
        estadoId: ESTADO_MOVIMIENTO_CAJA_VALIDADO,
        tipoCambio: tc,
        usuarioId: usuarioId ? Number(usuarioId) : null,
        moduloOrigenMotivoOperacionId: submoduloMotivo.id,
        origenMotivoOperacionId: detMov.id,
        fechaMotivoOperacion: new Date(),
        usuarioMotivoOperacionId: usuarioId ? Number(usuarioId) : null,
      };

      // Egreso principal: se usa el tipo de movimiento de la propia asignación
      const egreso = await registrarMovimientoEgreso({
        tx,
        cuenta,
        data: {
          ...baseMovimiento,
          tipoMovimientoId: detMov.tipoMovimientoId,
          monto,
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
                tipoMovimientoId: TIPO_MOVIMIENTO_ITF_COMISION,
                monto: comision,
                cuentaCorrienteOrigenId: cuenta.id,
                descripcion: `Comisión - ${descripcionMovimiento}`,
              },
            })
          : null;

      // ════════════════════════════════════════════════════════════
      // 6. ASIENTOS CONTABLES (si uno falla, se revierte toda la operación)
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

      asientos.push(
        await crearAsientoDeMovimiento({
          ...paramsAsiento,
          movimiento: egreso.movimiento,
          cuentaDebeId: cuentaEntregasRendir.id,
          glosa: `A RENDIR ${detMov.descripcion || detMov.tipoMovimiento?.nombre || ""}`.trim(),
          numeroDocumentoOrigen: numeroOperacion || null,
        }),
      );

      if (itfRegistro) {
        asientos.push(
          await crearAsientoDeMovimiento({
            ...paramsAsiento,
            movimiento: itfRegistro.movimiento,
            cuentaDebeId: cuentaGastoITF.id,
            centroCostoDebeId: cuentaGastoITF.centroCostoId,
            glosa: `POR EL ITF - ${descripcionMovimiento}`,
          }),
        );
      }

      if (comisionRegistro) {
        asientos.push(
          await crearAsientoDeMovimiento({
            ...paramsAsiento,
            movimiento: comisionRegistro.movimiento,
            cuentaDebeId: cuentaGastoComision.id,
            centroCostoDebeId: cuentaGastoComision.centroCostoId,
            glosa: `POR LA COMISIÓN BANCARIA - ${descripcionMovimiento}`,
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
      // 7. ACTUALIZAR LA ASIGNACIÓN CON LOS DATOS DE LA OPERACIÓN
      // ════════════════════════════════════════════════════════════
      // urlComprobanteOperacionMovCaja se completa después, cuando se genera el voucher PDF.
      await tx.detMovsEntregaRendir.update({
        where: { id: detMov.id },
        data: {
          refOperacionEspecializadaMovCaja: correlativo,
          validadoTesoreria: true,
          fechaValidacionTesoreria: new Date(),
          operacionMovCajaId: egreso.movimiento.id,
          fechaOperacionMovCaja: fechaContable,
          actualizadoPorId: usuarioId ? BigInt(usuarioId) : null,
        },
      });

      // ════════════════════════════════════════════════════════════
      // 8. RESPUESTA (misma forma que la transferencia, para reutilizar vouchers)
      // ════════════════════════════════════════════════════════════
      const movimientosCompletos = await tx.movimientoCaja.findMany({
        where: { id: { in: movimientos.map((m) => m.id) } },
        include: {
          tipoMovimiento: true,
          moneda: true,
          medioPago: true,
          empresa: true,
          cuentaCorrienteOrigen: {
            include: { banco: true, moneda: true, empresa: true },
          },
          cuentaCorrienteDestino: {
            include: { banco: true, moneda: true, empresa: true },
          },
        },
      });
      const movimientosMap = {};
      movimientosCompletos.forEach((m) => {
        movimientosMap[m.id.toString()] = m;
      });

      const etiquetasSaldo = {
        [egreso.movimiento.id]: "Egreso",
        ...(itfRegistro && { [itfRegistro.movimiento.id]: "ITF Origen" }),
        ...(comisionRegistro && {
          [comisionRegistro.movimiento.id]: "Comisión Origen",
        }),
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

      return {
        success: true,
        message: `Fondos entregados exitosamente a ${nombreResponsable}`,
        data: {
          correlativo,
          detMovsEntregaRendirId: detMov.id,
          movimientoEgresoId: egreso.movimiento.id,
          movimientoITFOrigenId: itfRegistro?.movimiento.id || null,
          movimientoComisionOrigenId: comisionRegistro?.movimiento.id || null,
          movimientos: {
            egreso: movimientosMap[egreso.movimiento.id.toString()] || null,
            itfOrigen: itfRegistro
              ? movimientosMap[itfRegistro.movimiento.id.toString()]
              : null,
            comisionOrigen: comisionRegistro
              ? movimientosMap[comisionRegistro.movimiento.id.toString()]
              : null,
          },
          saldosCuentaCorriente,
          asientosContables: asientos,
        },
      };
    });
  } catch (err) {
    if (err.code && err.code.startsWith("P")) {
      throw new DatabaseError(
        "Error de base de datos al atender asignación",
        err.message,
      );
    }
    throw err;
  }
};

/**
 * Registra la URL del voucher de la operación en la asignación.
 * Solo aplica a asignaciones ya atendidas: no toca asignaciones pendientes.
 */
const actualizarUrlComprobante = async (detMovsEntregaRendirId, urlPdf) => {
  if (!urlPdf || !String(urlPdf).trim()) {
    throw new ValidationError("La URL del comprobante es obligatoria");
  }
  const resultado = await prisma.detMovsEntregaRendir.updateMany({
    where: { id: BigInt(detMovsEntregaRendirId), validadoTesoreria: true },
    data: { urlComprobanteOperacionMovCaja: urlPdf },
  });
  if (resultado.count !== 1) {
    throw new NotFoundError("Asignación atendida no encontrada");
  }
  return { success: true };
};

export default {
  atenderAsignacion,
  actualizarUrlComprobante,
};
