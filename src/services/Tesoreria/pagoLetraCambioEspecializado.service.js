import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError, DatabaseError } from "../../utils/errors.js";
import correlativoService from "./correlativoOperacionCaja.service.js";
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";
import { entidadDeBanco } from "../../utils/entidadBanco.js";
import {
  TIPO_LETRA,
  MONEDA_SOLES_ID,
  CUENTAS_LETRA,
  TIPO_MOVIMIENTO_ITF_COMISION,
  CODIGOS_CUENTAS_ITF_COMISION,
  ESTADO_MOVIMIENTO_CAJA_VALIDADO,
} from "../../utils/letrasCambio.constants.js";
import {
  num,
  r2,
  aCentimos,
  deCentimos,
  TOLERANCIA,
  repartirProporcional,
  obtenerEstadosLetra,
  obtenerPersonalDeUsuario,
  obtenerCuentas,
  exigirCentroCosto,
  obtenerPeriodoAbierto,
  crearAsientoLetra,
} from "./letraCambioBase.service.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: PAGO / COBRO ESPECIALIZADO DE LETRAS DE CAMBIO (Tesorería)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Paga (letra por pagar) o cobra (letra por cobrar) una letra con UN movimiento de caja principal por el
 * total (capital + interés + mora), más ITF y comisión del banco si los hay. El interés y la mora se ingresan
 * a mano el día del pago; no se calculan. Réplica del pago múltiple de deudas tributarias adaptada a letras.
 *
 * Una sola transacción atómica:
 *   1. MovimientoCaja principal (+ ITF + comisión) con saldos de cuenta en cascada
 *   2. PagoLetraCambio con el desglose capital / interés / mora
 *   3. Saldo de capital y estado de la letra (PAGADA PARCIAL / PAGADA)
 *   4. Capital pagado atribuido a cada factura que respalda la letra (prorrata del saldo de cada una)
 *   5. Asientos (si uno falla se revierte toda la operación)
 *
 * Asiento del pago, libro CAJA_BANCOS:
 *   PAGAR : DEBE 423101/423102 letras por pagar (capital, entidad proveedor) + 673111 intereses + 679403 mora
 *           HABER banco
 *   COBRAR: DEBE banco
 *           HABER 123201/123202 letras por cobrar (capital, entidad cliente) + 772101 intereses + 7791 mora
 *
 * La letra se paga en la moneda de la cuenta bancaria elegida: si difiere de la de la letra, se convierte con el
 * tipo de cambio de la operación (solo soles <-> moneda extranjera). No se genera diferencia de cambio.
 * Los montos de capital, interés y mora se expresan siempre en la moneda de la LETRA.
 */

const convertir = (monto, origenId, destinoId, tipoCambio) => {
  const origen = Number(origenId);
  const destino = Number(destinoId);
  if (origen === destino) return num(monto);
  const tc = num(tipoCambio);
  if (!(tc > 0)) {
    throw new ValidationError("La cuenta bancaria está en una moneda distinta a la de la letra: ingrese el tipo de cambio para convertir el monto.");
  }
  if (origen === MONEDA_SOLES_ID) return num(monto) / tc;
  if (destino === MONEDA_SOLES_ID) return num(monto) * tc;
  throw new ValidationError("No se admite la conversión entre dos monedas extranjeras.");
};

const incluirLetra = {
  moneda: { select: { id: true, simbolo: true, codigoSunat: true } },
  estado: { select: { id: true, descripcion: true, severityColor: true } },
  girado: { select: { id: true, razonSocial: true, numeroDocumento: true } },
  beneficiario: { select: { id: true, razonSocial: true, numeroDocumento: true } },
  empresa: { select: { id: true, razonSocial: true, entidadComercialId: true } },
};

/** Letras con capital pendiente que se pueden pagar / cobrar desde Tesorería. */
export async function listarPendientes({ empresaId, tipoLetra } = {}) {
  try {
    const estados = await obtenerEstadosLetra(prisma);
    const letras = await prisma.letraCambio.findMany({
      where: {
        ...(empresaId ? { empresaId: BigInt(empresaId) } : {}),
        ...(tipoLetra ? { tipoLetra } : {}),
        saldoCapital: { gt: 0 },
        estadoId: { in: [estados.VIGENTE, estados.VENCIDA, estados.PROTESTADA, estados.PAGADA_PARCIAL] },
      },
      include: incluirLetra,
      orderBy: [{ fechaVencimiento: "asc" }, { id: "asc" }],
    });
    return letras;
  } catch (err) {
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error al consultar las letras pendientes", err.message);
    throw err;
  }
}

/**
 * @param {Object} datos
 * @param {number} datos.letraCambioId
 * @param {string|Date} datos.fechaPago
 * @param {number} datos.cuentaCorrienteId - Cuenta bancaria de donde sale (PAGAR) o a donde entra (COBRAR) el dinero
 * @param {number} datos.medioPagoId
 * @param {number} datos.tipoMovimientoId - Tipo de movimiento del movimiento principal
 * @param {number} datos.montoCapital - Capital que se amortiza (moneda de la letra)
 * @param {number} [datos.montoInteres=0] - Interés ingresado a mano (moneda de la letra)
 * @param {number} [datos.montoMora=0] - Mora ingresada a mano (moneda de la letra)
 * @param {number} [datos.tipoCambio] - Obligatorio si la letra o la cuenta están en moneda extranjera
 * @param {number} [datos.itf=0] / [datos.comision=0] - En la moneda de la cuenta
 * @param {string} [datos.numeroOperacion] / [datos.descripcion] / [datos.observaciones]
 * @param {number} datos.usuarioId
 */
export async function procesarPago(datos) {
  const { letraCambioId, fechaPago, cuentaCorrienteId, medioPagoId, tipoMovimientoId, usuarioId } = datos;
  try {
    if (!letraCambioId) throw new ValidationError("Seleccione la letra de cambio.");
    if (!fechaPago || !cuentaCorrienteId || !medioPagoId || !tipoMovimientoId) {
      throw new ValidationError("La fecha, la cuenta corriente, el medio de pago y el tipo de movimiento son obligatorios.");
    }
    const montoCapital = r2(datos.montoCapital);
    const montoInteres = r2(datos.montoInteres);
    const montoMora = r2(datos.montoMora);
    if (montoCapital < 0 || montoInteres < 0 || montoMora < 0) {
      throw new ValidationError("El capital, el interés y la mora no pueden ser negativos.");
    }
    if (!(montoCapital + montoInteres + montoMora > 0)) {
      throw new ValidationError("Ingrese el capital, el interés o la mora que se paga: el total debe ser mayor a cero.");
    }
    const itf = r2(datos.itf);
    const comision = r2(datos.comision);
    if (itf < 0) throw new ValidationError("El ITF no puede ser negativo.");
    if (comision < 0) throw new ValidationError("La comisión no puede ser negativa.");

    return await prisma.$transaction(async (tx) => {
      // ── 1. Letra (bloqueada) ───────────────────────────────
      await tx.$queryRaw`SELECT id FROM "LetraCambio" WHERE id = ${BigInt(letraCambioId)} FOR UPDATE`;
      const letra = await tx.letraCambio.findUnique({
        where: { id: BigInt(letraCambioId) },
        include: { ...incluirLetra, documentos: { orderBy: { id: "asc" } } },
      });
      if (!letra) throw new NotFoundError("Letra de cambio no encontrada.");
      const estados = await obtenerEstadosLetra(tx);
      const estadoNoPagable = [estados.PAGADA, estados.ANULADA, estados.REFINANCIADA].find((e) => Number(e) === Number(letra.estadoId));
      if (estadoNoPagable) {
        throw new ValidationError(`La letra ${letra.numeroDocumento} está ${letra.estado.descripcion}: no admite pagos.`);
      }
      const saldoCapital = r2(num(letra.saldoCapital));
      if (saldoCapital <= 0) throw new ValidationError(`La letra ${letra.numeroDocumento} no tiene capital pendiente.`);
      if (montoCapital > saldoCapital + TOLERANCIA) {
        throw new ValidationError(
          `El capital a pagar (${letra.moneda.simbolo} ${montoCapital.toFixed(2)}) excede el saldo de capital de la letra ${letra.numeroDocumento} (${letra.moneda.simbolo} ${saldoCapital.toFixed(2)}).`,
        );
      }
      const capitalAplicado = Math.abs(saldoCapital - montoCapital) <= TOLERANCIA ? saldoCapital : montoCapital;

      const pagar = letra.tipoLetra === TIPO_LETRA.PAGAR;
      const contraparte = pagar ? letra.beneficiario : letra.girado;
      const empresaId = Number(letra.empresaId);

      // ── 2. Cuenta, medio de pago y tipo de movimiento ──────
      const cuenta = await tx.cuentaCorriente.findUnique({
        where: { id: Number(cuentaCorrienteId) },
        include: { banco: { select: { id: true, nombre: true, enlaceEntidadComercialId: true } }, moneda: { select: { id: true, simbolo: true } } },
      });
      if (!cuenta) throw new NotFoundError("Cuenta corriente no encontrada.");
      if (Number(cuenta.empresaId) !== empresaId) {
        throw new ValidationError(`La cuenta corriente no pertenece a ${letra.empresa.razonSocial}, la empresa de la letra.`);
      }
      if (!cuenta.cuentaContableId) throw new ValidationError("La cuenta corriente no tiene cuenta contable asociada.");

      const medioPago = await tx.medioPago.findUnique({ where: { id: Number(medioPagoId) } });
      if (!medioPago) throw new NotFoundError("Medio de pago no encontrado.");
      const tipoMovimiento = await tx.tipoMovEntregaRendir.findFirst({ where: { id: Number(tipoMovimientoId), activo: true } });
      if (!tipoMovimiento) throw new NotFoundError("Tipo de movimiento no encontrado o inactivo.");
      if (Boolean(tipoMovimiento.esIngreso) !== !pagar) {
        throw new ValidationError(
          `El tipo de movimiento "${tipoMovimiento.nombre}" es ${tipoMovimiento.esIngreso ? "un ingreso" : "un egreso"}, pero ${pagar ? "pagar una letra por pagar es un egreso" : "cobrar una letra por cobrar es un ingreso"}. Elija otro tipo de movimiento.`,
        );
      }

      // ── 3. Montos en la moneda de la cuenta y tipo de cambio ──
      const monedaLetraId = Number(letra.monedaId);
      const monedaCuentaId = Number(cuenta.monedaId);
      const hayExtranjera = monedaLetraId !== MONEDA_SOLES_ID || monedaCuentaId !== MONEDA_SOLES_ID;
      const tc = hayExtranjera ? num(datos.tipoCambio) : 1;
      if (hayExtranjera && !(tc > 0)) {
        throw new ValidationError("Ingrese el tipo de cambio de la fecha de pago para convertir la operación a soles.");
      }
      const totalLetra = r2(montoCapital + montoInteres + montoMora);
      const montoMovimiento = r2(convertir(totalLetra, monedaLetraId, monedaCuentaId, tc));
      if (!(montoMovimiento > 0)) throw new ValidationError("El monto del movimiento resulta cero: revise los importes y el tipo de cambio.");
      const aSoles = (monto, monedaId) => (Number(monedaId) === MONEDA_SOLES_ID ? r2(monto) : r2(monto * tc));
      const extranjeraCuenta = monedaCuentaId !== MONEDA_SOLES_ID;
      const extranjeraLetra = monedaLetraId !== MONEDA_SOLES_ID;

      // ── 4. Datos contables ─────────────────────────────────
      const cuentasDef = CUENTAS_LETRA[letra.tipoLetra];
      const codigos = [cuentasDef.letra[monedaLetraId]];
      if (montoInteres > 0) codigos.push(cuentasDef.interes);
      if (montoMora > 0) codigos.push(cuentasDef.mora);
      if (itf > 0) codigos.push(CODIGOS_CUENTAS_ITF_COMISION.ITF);
      if (comision > 0) codigos.push(CODIGOS_CUENTAS_ITF_COMISION.COMISIONES_BANCARIAS);
      if (codigos.some((c) => !c)) throw new ValidationError(`No hay cuenta de letras definida para la moneda de la letra ${letra.moneda.codigoSunat}.`);
      const cuentaPlan = await obtenerCuentas(tx, codigos);

      const submoduloMovCaja = await tx.submoduloSistema.findFirst({ where: { nombreModeloOrigen: "MovimientoCaja", activo: true } });
      if (!submoduloMovCaja) throw new ValidationError('No se encontró el submódulo "MovimientoCaja".');
      const submoduloPagoLetra = await tx.submoduloSistema.findFirst({ where: { ruta: "pago-letra-cambio", activo: true } });

      const fechaContable = new Date(fechaPago);
      const correlativo = await correlativoService.generarCorrelativo(empresaId, tx);
      const periodo = await obtenerPeriodoAbierto(tx, empresaId, fechaContable, letra.empresa.razonSocial);
      const personalId = await obtenerPersonalDeUsuario(tx, usuarioId);

      const desglose = [
        capitalAplicado > 0 ? `CAPITAL ${letra.moneda.simbolo} ${capitalAplicado.toFixed(2)}` : null,
        montoInteres > 0 ? `INTERÉS ${letra.moneda.simbolo} ${montoInteres.toFixed(2)}` : null,
        montoMora > 0 ? `MORA ${letra.moneda.simbolo} ${montoMora.toFixed(2)}` : null,
      ].filter(Boolean).join(" - ");
      const descripcionMovimiento =
        (datos.descripcion && String(datos.descripcion).trim()) ||
        `${pagar ? "PAGO" : "COBRANZA"} DE LETRA DE CAMBIO N° ${letra.numeroDocumento} - ${contraparte.razonSocial} - ${desglose} - ${cuenta.banco?.nombre || "BANCO"} CTA. ${cuenta.numeroCuenta || cuenta.id}`;

      // ── 5. Movimientos de caja y saldos en cascada ─────────
      const crearMovimiento = async ({ data, esIngreso = false, saldoAnteriorManual = null }) => {
        const movimiento = await tx.movimientoCaja.create({ data });
        const ultimo =
          saldoAnteriorManual !== null
            ? null
            : await tx.saldoCuentaCorriente.findFirst({ where: { cuentaCorrienteId: cuenta.id }, orderBy: [{ fecha: "desc" }, { id: "desc" }] });
        const saldoAnterior = saldoAnteriorManual !== null ? Number(saldoAnteriorManual) : ultimo ? Number(ultimo.saldoActual) : 0;
        const registro = await tx.saldoCuentaCorriente.create({
          data: {
            cuentaCorrienteId: cuenta.id,
            empresaId: cuenta.empresaId,
            fecha: data.fechaOperacionMovCaja,
            saldoAnterior,
            ingresos: esIngreso ? data.monto : 0,
            egresos: esIngreso ? 0 : data.monto,
            saldoActual: esIngreso ? saldoAnterior + data.monto : saldoAnterior - data.monto,
            movimientoCajaId: movimiento.id,
            centroCostoId: null,
            conciliado: false,
          },
        });
        return { movimiento, saldoActual: Number(registro.saldoActual) };
      };

      const baseMovimiento = {
        refOperacionEspecializadaMovCaja: correlativo,
        empresaId,
        monedaId: cuenta.monedaId,
        medioPagoId: Number(medioPagoId),
        fechaOperacionMovCaja: fechaContable,
        estadoId: ESTADO_MOVIMIENTO_CAJA_VALIDADO,
        esGerencial: false,
        tipoCambio: tc,
        usuarioId: usuarioId ? Number(usuarioId) : null,
        moduloOrigenMotivoOperacionId: submoduloPagoLetra?.id || null,
        fechaMotivoOperacion: new Date(),
        usuarioMotivoOperacionId: usuarioId ? Number(usuarioId) : null,
      };

      const principal = await crearMovimiento({
        esIngreso: !pagar,
        data: {
          ...baseMovimiento,
          tipoMovimientoId: tipoMovimiento.id,
          entidadComercialId: contraparte.id,
          monto: montoMovimiento,
          cuentaCorrienteDestinoId: cuenta.id,
          descripcion: descripcionMovimiento,
          numeroOperacionPagoBanco: datos.numeroOperacion || null,
          fechaOperacionPagoBanco: fechaContable,
        },
      });
      const itfRegistro = itf > 0
        ? await crearMovimiento({
            saldoAnteriorManual: principal.saldoActual,
            data: {
              ...baseMovimiento,
              entidadComercialId: entidadDeBanco(cuenta.banco),
              tipoMovimientoId: TIPO_MOVIMIENTO_ITF_COMISION,
              monto: itf,
              cuentaCorrienteOrigenId: cuenta.id,
              descripcion: `ITF - ${descripcionMovimiento}`,
            },
          })
        : null;
      const comisionRegistro = comision > 0
        ? await crearMovimiento({
            saldoAnteriorManual: itfRegistro?.saldoActual ?? principal.saldoActual,
            data: {
              ...baseMovimiento,
              entidadComercialId: entidadDeBanco(cuenta.banco),
              tipoMovimientoId: TIPO_MOVIMIENTO_ITF_COMISION,
              monto: comision,
              cuentaCorrienteOrigenId: cuenta.id,
              descripcion: `Comisión - ${descripcionMovimiento}`,
            },
          })
        : null;

      // ── 6. Pago de la letra, saldo y estado ────────────────
      const pago = await tx.pagoLetraCambio.create({
        data: {
          letraCambioId: letra.id,
          fechaPago: fechaContable,
          montoPago: montoMovimiento,
          monedaId: cuenta.monedaId,
          tipoCambio: hayExtranjera ? tc : null,
          montoCapital: capitalAplicado,
          montoInteres,
          montoMora,
          medioPagoId: Number(medioPagoId),
          numeroOperacion: datos.numeroOperacion ? String(datos.numeroOperacion).slice(0, 50) : null,
          bancoId: cuenta.bancoId || null,
          movimientoCajaId: principal.movimiento.id,
          fechaContable,
          periodoContableId: periodo.id,
          observaciones: datos.observaciones || null,
          registradoPor: personalId,
          refOperacionEspecializadaMovCaja: correlativo,
        },
      });
      await tx.movimientoCaja.update({ where: { id: principal.movimiento.id }, data: { origenMotivoOperacionId: pago.id } });

      const nuevoSaldo = r2(saldoCapital - capitalAplicado);
      const nuevoEstadoId =
        nuevoSaldo <= 0
          ? estados.PAGADA
          : [estados.VENCIDA, estados.PROTESTADA].some((e) => Number(e) === Number(letra.estadoId))
            ? letra.estadoId
            : estados.PAGADA_PARCIAL;
      await tx.letraCambio.update({
        where: { id: letra.id },
        data: {
          saldoCapital: nuevoSaldo,
          interesPagado: r2(num(letra.interesPagado) + montoInteres),
          moraPagada: r2(num(letra.moraPagada) + montoMora),
          estadoId: nuevoEstadoId,
          actualizadoPor: usuarioId ? BigInt(usuarioId) : null,
        },
      });

      // ── 7. Capital pagado por factura (prorrata de lo que falta de cada una) ──
      const pendientesCent = letra.documentos.map((d) => aCentimos(Math.max(0, num(d.montoCanjeado) - num(d.capitalPagado))));
      const partes = repartirProporcional(pendientesCent, aCentimos(capitalAplicado));
      for (const [i, d] of letra.documentos.entries()) {
        if (partes[i] <= 0n) continue;
        await tx.letraCambioDocumento.update({
          where: { id: d.id },
          data: { capitalPagado: r2(num(d.capitalPagado) + deCentimos(partes[i])) },
        });
      }

      // ── 8. Asientos ────────────────────────────────────────
      const cuentaLetraPlan = cuentaPlan(cuentasDef.letra[monedaLetraId]);
      const lineaBanco = (esDebe) => ({
        planCuentaId: cuenta.cuentaContableId,
        debe: esDebe ? aSoles(montoMovimiento, monedaCuentaId) : 0,
        haber: esDebe ? 0 : aSoles(montoMovimiento, monedaCuentaId),
        debeME: esDebe && extranjeraCuenta ? montoMovimiento : null,
        haberME: !esDebe && extranjeraCuenta ? montoMovimiento : null,
        entidadComercialId: null,
      });
      const lineaConcepto = (planCuenta, monto, esDebe, extra = {}) => ({
        planCuentaId: planCuenta.id,
        debe: esDebe ? aSoles(monto, monedaLetraId) : 0,
        haber: esDebe ? 0 : aSoles(monto, monedaLetraId),
        debeME: esDebe && extranjeraLetra ? monto : null,
        haberME: !esDebe && extranjeraLetra ? monto : null,
        ...extra,
      });
      const lineasConcepto = [];
      if (capitalAplicado > 0) {
        lineasConcepto.push(lineaConcepto(cuentaLetraPlan, capitalAplicado, pagar, {
          entidadComercialId: contraparte.id,
          numeroDocumentoOrigen: letra.numeroDocumento,
          fechaDocumentoOrigen: letra.fechaEmision,
          fechaVenceDocumentoOrigen: letra.fechaVencimiento,
        }));
      }
      if (montoInteres > 0) {
        const c = cuentaPlan(cuentasDef.interes);
        lineasConcepto.push(lineaConcepto(c, montoInteres, pagar, { centroCostoId: exigirCentroCosto(c) }));
      }
      if (montoMora > 0) {
        const c = cuentaPlan(cuentasDef.mora);
        lineasConcepto.push(lineaConcepto(c, montoMora, pagar, { centroCostoId: exigirCentroCosto(c) }));
      }

      const paramsAsiento = { empresaId, periodo, fecha: fechaContable, tipoLibroId: TIPO_LIBRO.CAJA_BANCOS, submodulo: submoduloMovCaja, tipoCambio: tc, usuarioId };
      const asientos = [];
      asientos.push(
        await crearAsientoLetra(tx, {
          ...paramsAsiento,
          glosa: descripcionMovimiento,
          procesoOrigenId: principal.movimiento.id,
          monedaId: cuenta.monedaId,
          totalCabecera: montoMovimiento,
          lineas: pagar ? [...lineasConcepto, lineaBanco(false)] : [lineaBanco(true), ...lineasConcepto],
        }),
      );

      const asientoGasto = async (registro, monto, codigo, glosa) => {
        const c = cuentaPlan(codigo);
        return crearAsientoLetra(tx, {
          ...paramsAsiento,
          glosa,
          procesoOrigenId: registro.movimiento.id,
          monedaId: cuenta.monedaId,
          totalCabecera: monto,
          lineas: [
            { planCuentaId: c.id, debe: aSoles(monto, monedaCuentaId), haber: 0, debeME: extranjeraCuenta ? monto : null, centroCostoId: exigirCentroCosto(c) },
            { planCuentaId: cuenta.cuentaContableId, debe: 0, haber: aSoles(monto, monedaCuentaId), haberME: extranjeraCuenta ? monto : null },
          ],
        });
      };
      const referencia = `${pagar ? "PAGO" : "COBRANZA"} DE LETRA DE CAMBIO N° ${letra.numeroDocumento} - ${cuenta.banco?.nombre || "BANCO"} CTA. ${cuenta.numeroCuenta || cuenta.id} - OP. N° ${correlativo}`;
      if (itfRegistro) asientos.push(await asientoGasto(itfRegistro, itf, CODIGOS_CUENTAS_ITF_COMISION.ITF, `POR EL ITF - ${referencia}`));
      if (comisionRegistro) asientos.push(await asientoGasto(comisionRegistro, comision, CODIGOS_CUENTAS_ITF_COMISION.COMISIONES_BANCARIAS, `POR LA COMISIÓN BANCARIA - ${referencia}`));

      const movimientos = [principal.movimiento, itfRegistro?.movimiento, comisionRegistro?.movimiento].filter(Boolean);
      await tx.movimientoCaja.updateMany({ where: { id: { in: movimientos.map((m) => m.id) } }, data: { asientosGenerados: true } });

      // ── 9. Respuesta (misma forma que el resto de pagos especializados) ──
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
      const movimientosMap = Object.fromEntries(movimientosCompletos.map((m) => [m.id.toString(), m]));
      const etiquetas = {
        [principal.movimiento.id]: pagar ? "Egreso" : "Ingreso",
        ...(itfRegistro && { [itfRegistro.movimiento.id]: "ITF" }),
        ...(comisionRegistro && { [comisionRegistro.movimiento.id]: "Comisión" }),
      };
      const saldos = await tx.saldoCuentaCorriente.findMany({
        where: { movimientoCajaId: { in: movimientos.map((m) => m.id) } },
        orderBy: { id: "asc" },
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

      const documentosSaldados = await documentosTotalmentePagados(tx, letra.id);

      return {
        success: true,
        message: `${pagar ? "Pago" : "Cobranza"} de la letra ${letra.numeroDocumento} registrado exitosamente`,
        data: {
          correlativo: Number(correlativo),
          pagoLetraCambioId: pago.id,
          letraCambioId: letra.id,
          numeroLetra: letra.numeroDocumento,
          movimientoPrincipalId: principal.movimiento.id,
          movimientoITFId: itfRegistro?.movimiento.id || null,
          movimientoComisionId: comisionRegistro?.movimiento.id || null,
          movimientos: {
            principal: movimientosMap[principal.movimiento.id.toString()] || null,
            itf: itfRegistro ? movimientosMap[itfRegistro.movimiento.id.toString()] : null,
            comision: comisionRegistro ? movimientosMap[comisionRegistro.movimiento.id.toString()] : null,
          },
          saldosCuentaCorriente,
          asientosContables: asientos.map((a) => ({ id: a.id, numeroAsiento: a.numeroAsiento })),
          resumen: {
            tipoLetra: letra.tipoLetra,
            capital: capitalAplicado,
            interes: montoInteres,
            mora: montoMora,
            totalLetra,
            montoMovimiento,
            itf,
            comision,
            saldoCapitalLetra: nuevoSaldo,
            estadoLetraId: nuevoEstadoId,
            letraCancelada: nuevoSaldo <= 0,
            documentosSaldados,
          },
        },
      };
    }, { timeout: 60000 });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error de base de datos al procesar el pago de la letra", err.message);
    throw err;
  }
}

/**
 * Facturas respaldadas por la letra cuyo capital quedó totalmente pagado considerando TODAS sus letras
 * (las refinanciadas incluidas). Sobre ellas se liberan la detracción, retención y percepción.
 */
export async function documentosTotalmentePagados(db, letraId) {
  const propios = await db.letraCambioDocumento.findMany({ where: { letraCambioId: BigInt(letraId) } });
  const resultado = [];
  for (const d of propios) {
    const filas = await db.letraCambioDocumento.findMany({
      where: d.cuentaPorPagarId ? { cuentaPorPagarId: d.cuentaPorPagarId } : { cuentaPorCobrarId: d.cuentaPorCobrarId },
    });
    const saldado = filas.every((f) => num(f.capitalPagado) + TOLERANCIA >= num(f.montoCanjeado));
    if (saldado) resultado.push({ cuentaPorPagarId: d.cuentaPorPagarId, cuentaPorCobrarId: d.cuentaPorCobrarId });
  }
  return resultado;
}

/**
 * Recalcula la letra desde los pagos que quedan (única verdad): saldo de capital, intereses y mora pagados,
 * estado y capital pagado de cada factura (se reproducen los pagos en orden, igual que al registrarlos).
 * Se usa al revertir un pago de Tesorería.
 */
export async function recalcularLetra(tx, letraId) {
  const letra = await tx.letraCambio.findUnique({
    where: { id: BigInt(letraId) },
    include: { documentos: { orderBy: { id: "asc" } }, pagos: { orderBy: { id: "asc" } } },
  });
  if (!letra) return null;
  const estados = await obtenerEstadosLetra(tx);

  const capitalPagado = r2(letra.pagos.reduce((a, p) => a + num(p.montoCapital), 0));
  let saldoCapital = r2(num(letra.montoOriginal) - capitalPagado);
  if (Math.abs(saldoCapital) <= TOLERANCIA) saldoCapital = 0;

  // Capital pagado por factura: se reproducen los pagos restantes
  const pagadoPorDoc = letra.documentos.map(() => 0n);
  const tope = letra.documentos.map((d) => aCentimos(num(d.montoCanjeado)));
  for (const pago of letra.pagos) {
    const pendientes = tope.map((t, i) => (t > pagadoPorDoc[i] ? t - pagadoPorDoc[i] : 0n));
    const partes = repartirProporcional(pendientes, aCentimos(num(pago.montoCapital)));
    partes.forEach((parte, i) => (pagadoPorDoc[i] += parte));
  }
  for (const [i, d] of letra.documentos.entries()) {
    await tx.letraCambioDocumento.update({ where: { id: d.id }, data: { capitalPagado: deCentimos(pagadoPorDoc[i]) } });
  }

  const estadoId =
    Number(letra.estadoId) === Number(estados.ANULADA) || Number(letra.estadoId) === Number(estados.REFINANCIADA)
      ? letra.estadoId
      : saldoCapital <= 0
        ? estados.PAGADA
        : letra.protestada
          ? estados.PROTESTADA
          : new Date(letra.fechaVencimiento) < new Date()
            ? estados.VENCIDA
            : capitalPagado > 0
              ? estados.PAGADA_PARCIAL
              : estados.VIGENTE;

  return tx.letraCambio.update({
    where: { id: letra.id },
    data: {
      saldoCapital,
      interesPagado: r2(letra.pagos.reduce((a, p) => a + num(p.montoInteres), 0)),
      moraPagada: r2(letra.pagos.reduce((a, p) => a + num(p.montoMora), 0)),
      estadoId,
    },
  });
}

export default { listarPendientes, procesarPago, documentosTotalmentePagados, recalcularLetra };
