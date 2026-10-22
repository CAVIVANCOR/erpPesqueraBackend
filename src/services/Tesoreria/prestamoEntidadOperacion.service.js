import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError, DatabaseError } from "../../utils/errors.js";
import correlativoService from "./correlativoOperacionCaja.service.js";
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";
import { entidadDeBanco } from "../../utils/entidadBanco.js";
import { ESTADO_PRESTAMO_RELACIONADO as ESTADO } from "../../utils/estados.constants.js";
import {
  SENTIDO_PRESTAMO_ENTIDAD as SENTIDO,
  CUENTAS_PRESTAMO_ENTIDAD,
  RUTA_SUBMODULO_PRESTAMO_ENTIDAD,
} from "../../utils/prestamoEntidad.constants.js";
import {
  MONEDA_SOLES_ID,
  TIPO_MOVIMIENTO_ITF_COMISION,
  CODIGOS_CUENTAS_ITF_COMISION,
  ESTADO_MOVIMIENTO_CAJA_VALIDADO,
} from "../../utils/letrasCambio.constants.js";
import { obtenerCuentas, exigirCentroCosto, obtenerPeriodoAbierto, crearAsientoLetra, TOLERANCIA } from "./letraCambioBase.service.js";
import prestamoEntidadService, { crearConNumero, num, r2 } from "./prestamoEntidad.service.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: OPERACIONES DE TESORERÍA DE PRÉSTAMOS CON ACCIONISTAS Y TERCEROS
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Una sola cuenta bancaria por operación (la cuenta contable del banco es la de la cuenta corriente elegida).
 * Solo capital: sin intereses, mora ni retención.
 *
 *   RECIBIDO (la empresa es deudora)
 *     DESEMBOLSO = INGRESO  DEBE banco / HABER 441111-2 (accionista) o 461101-2 (tercero)
 *     PAGO       = EGRESO   DEBE 441111-2 o 461101-2 / HABER banco
 *   OTORGADO (la empresa es acreedora)
 *     DESEMBOLSO = EGRESO   DEBE 142211-2 (accionista) o 161111-2 (tercero) / HABER banco
 *     COBRO      = INGRESO  DEBE banco / HABER 142211-2 o 161111-2
 *
 * La cuenta bancaria debe ser de la empresa del préstamo y estar en la moneda del préstamo. Si la moneda es
 * extranjera, el tipo de cambio de la fecha convierte los asientos a soles.
 * Una sola transacción: movimiento de caja (+ ITF + comisión) con saldos en cascada, préstamo o pago, asientos.
 */

const TIPOS_OPERACION = { DESEMBOLSO: "DESEMBOLSO", PAGO: "PAGO" };

const aBooleano = (valor) => (typeof valor === "string" ? valor === "true" : valor);

async function procesar(datos, operacion) {
  const { cuentaCorrienteId, medioPagoId, tipoMovimientoId, usuarioId } = datos;
  const fecha = operacion === TIPOS_OPERACION.DESEMBOLSO ? datos.fechaDesembolso : datos.fechaPago;
  try {
    if (!fecha || !cuentaCorrienteId || !medioPagoId || !tipoMovimientoId) {
      throw new ValidationError("La fecha, la cuenta corriente, el medio de pago y el tipo de movimiento son obligatorios.");
    }
    const monto = r2(datos.monto);
    if (!(monto > 0)) throw new ValidationError("El monto debe ser mayor a cero.");
    const itf = r2(datos.itf);
    const comision = r2(datos.comision);
    if (itf < 0) throw new ValidationError("El ITF no puede ser negativo.");
    if (comision < 0) throw new ValidationError("La comisión no puede ser negativa.");

    return await prisma.$transaction(async (tx) => {
      // ── 1. Préstamo (pago/cobro) o datos del préstamo nuevo (desembolso) ──
      let prestamo = null;
      let empresaId;
      let entidadId;
      let sentido;
      let esAccionista;
      if (operacion === TIPOS_OPERACION.PAGO) {
        if (!datos.prestamoEntidadId) throw new ValidationError("Seleccione el préstamo al que se aplica la devolución.");
        await tx.$queryRaw`SELECT id FROM "PrestamoEntidad" WHERE id = ${BigInt(datos.prestamoEntidadId)} FOR UPDATE`;
        prestamo = await tx.prestamoEntidad.findUnique({
          where: { id: BigInt(datos.prestamoEntidadId) },
          include: { moneda: { select: { simbolo: true } }, empresa: { select: { razonSocial: true } } },
        });
        if (!prestamo) throw new NotFoundError("El préstamo seleccionado no existe.");
        if (Number(prestamo.estadoId) !== ESTADO.VIGENTE) {
          throw new ValidationError(`El préstamo N° ${prestamo.numeroPrestamo} no admite devoluciones porque no está vigente (ya fue pagado o anulado).`);
        }
        const saldo = r2(num(prestamo.saldoCapital));
        if (monto > saldo + TOLERANCIA) {
          throw new ValidationError(
            `El monto (${prestamo.moneda.simbolo} ${monto.toFixed(2)}) excede el saldo pendiente del préstamo N° ${prestamo.numeroPrestamo} (${prestamo.moneda.simbolo} ${saldo.toFixed(2)}).`,
          );
        }
        empresaId = Number(prestamo.empresaId);
        entidadId = prestamo.entidadComercialId;
        sentido = prestamo.sentido;
        esAccionista = prestamo.esAccionista;
      } else {
        if (!datos.empresaId) throw new ValidationError("Seleccione la empresa del préstamo.");
        if (!Object.values(SENTIDO).includes(datos.sentido)) {
          throw new ValidationError("Indique si la empresa es Prestamista (presta el dinero) o Deudor (recibe el préstamo y debe devolverlo).");
        }
        const otraParte = datos.sentido === SENTIDO.RECIBIDO ? "Prestamista" : "Deudor";
        if (!datos.entidadComercialId) throw new ValidationError(`Seleccione el ${otraParte} del préstamo.`);
        if (datos.esAccionista === undefined || datos.esAccionista === null || datos.esAccionista === "") {
          throw new ValidationError(`Indique si el ${otraParte} es accionista o tercero.`);
        }
        if (datos.fechaVencimiento && new Date(datos.fechaVencimiento) < new Date(fecha)) {
          throw new ValidationError("La fecha de vencimiento no puede ser anterior a la fecha de desembolso.");
        }
        empresaId = Number(datos.empresaId);
        entidadId = BigInt(datos.entidadComercialId);
        sentido = datos.sentido;
        esAccionista = Boolean(aBooleano(datos.esAccionista));
      }

      const empresa = await tx.empresa.findUnique({ where: { id: empresaId }, select: { id: true, razonSocial: true } });
      if (!empresa) throw new NotFoundError("La empresa del préstamo no existe.");
      const contraparte = await tx.entidadComercial.findUnique({ where: { id: entidadId }, select: { id: true, razonSocial: true } });
      if (!contraparte) throw new NotFoundError(`El ${sentido === SENTIDO.RECIBIDO ? "Prestamista" : "Deudor"} del préstamo no existe.`);

      // El loan account va al DEBE al otorgar el préstamo o al pagar uno recibido; el banco va al lado contrario
      const loanEnDebe = (operacion === TIPOS_OPERACION.DESEMBOLSO) === (sentido === SENTIDO.OTORGADO);
      const esIngreso = !loanEnDebe;
      const tipoContraparte = esAccionista ? "ACCIONISTA" : "TERCERO";

      // ── 2. Cuenta, medio de pago y tipo de movimiento ──
      const cuenta = await tx.cuentaCorriente.findUnique({
        where: { id: Number(cuentaCorrienteId) },
        include: { banco: { select: { id: true, nombre: true } }, moneda: { select: { id: true, simbolo: true, codigoSunat: true } } },
      });
      if (!cuenta) throw new NotFoundError("Cuenta corriente no encontrada.");
      if (Number(cuenta.empresaId) !== empresaId) {
        throw new ValidationError(`La cuenta corriente no pertenece a ${empresa.razonSocial}, la empresa del préstamo. Elija una cuenta de esa empresa.`);
      }
      if (!cuenta.cuentaContableId) {
        throw new ValidationError(`La cuenta corriente ${cuenta.numeroCuenta || cuenta.id} no tiene cuenta contable asociada. Asígnela en el mantenimiento de cuentas corrientes.`);
      }
      const monedaId = prestamo ? Number(prestamo.monedaId) : Number(cuenta.monedaId);
      if (Number(cuenta.monedaId) !== monedaId) {
        throw new ValidationError(
          `La cuenta corriente está en ${cuenta.moneda.simbolo} y el préstamo en ${prestamo.moneda.simbolo}: elija una cuenta en la moneda del préstamo.`,
        );
      }
      const medioPago = await tx.medioPago.findUnique({ where: { id: Number(medioPagoId) } });
      if (!medioPago) throw new NotFoundError("Medio de pago no encontrado.");
      const tipoMovimiento = await tx.tipoMovEntregaRendir.findFirst({ where: { id: Number(tipoMovimientoId), activo: true } });
      if (!tipoMovimiento) throw new NotFoundError("Tipo de movimiento no encontrado o inactivo.");
      if (Boolean(tipoMovimiento.esIngreso) !== esIngreso) {
        throw new ValidationError(
          `El tipo de movimiento "${tipoMovimiento.nombre}" es ${tipoMovimiento.esIngreso ? "un ingreso" : "un egreso"}, pero esta operación es ${esIngreso ? "un ingreso" : "un egreso"} de caja. Elija otro tipo de movimiento.`,
        );
      }

      // ── 3. Moneda y tipo de cambio ──
      const extranjera = monedaId !== MONEDA_SOLES_ID;
      const tc = extranjera ? num(datos.tipoCambio) : 1;
      if (extranjera && !(tc > 0)) throw new ValidationError("Ingrese el tipo de cambio de la fecha para convertir la operación a soles.");
      const aSoles = (importe) => (extranjera ? r2(importe * tc) : r2(importe));

      // ── 4. Datos contables ──
      const codigoCuentaPrestamo = CUENTAS_PRESTAMO_ENTIDAD[sentido][esAccionista ? "accionista" : "tercero"][monedaId];
      if (!codigoCuentaPrestamo) throw new ValidationError(`No hay cuenta contable de préstamos definida para la moneda ${cuenta.moneda.codigoSunat}.`);
      const codigos = [codigoCuentaPrestamo];
      if (itf > 0) codigos.push(CODIGOS_CUENTAS_ITF_COMISION.ITF);
      if (comision > 0) codigos.push(CODIGOS_CUENTAS_ITF_COMISION.COMISIONES_BANCARIAS);
      const cuentaPlan = await obtenerCuentas(tx, codigos);

      const submoduloMovCaja = await tx.submoduloSistema.findFirst({ where: { nombreModeloOrigen: "MovimientoCaja", activo: true } });
      if (!submoduloMovCaja) throw new ValidationError('No se encontró el submódulo "MovimientoCaja".');
      const submoduloPrestamo = await tx.submoduloSistema.findFirst({ where: { ruta: RUTA_SUBMODULO_PRESTAMO_ENTIDAD, activo: true } });

      // El pago o cobro hereda el libro (fiscal / gerencial) del préstamo; el desembolso lo define el usuario
      const esGerencial = prestamo ? Boolean(prestamo.esGerencial) : Boolean(aBooleano(datos.esGerencial));
      const fechaContable = new Date(fecha);
      const correlativo = await correlativoService.generarCorrelativo(empresaId, tx);
      const periodo = await obtenerPeriodoAbierto(tx, empresaId, fechaContable, empresa.razonSocial);

      // ── 5. Préstamo nuevo (desembolso): se crea primero para conocer su número ──
      const numeroOperacion = datos.numeroOperacion ? String(datos.numeroOperacion).slice(0, 40) : null;
      if (operacion === TIPOS_OPERACION.DESEMBOLSO) {
        prestamo = await crearConNumero(tx, {
          empresaId: BigInt(empresaId),
          entidadComercialId: entidadId,
          sentido,
          esAccionista,
          esGerencial,
          numeroOperacion,
          cuentaCorrienteId: BigInt(cuenta.id),
          refOperacionEspecializadaMovCaja: correlativo,
          medioPagoId: BigInt(medioPago.id),
          fechaContable,
          periodoContableId: periodo.id,
          fechaDesembolso: fechaContable,
          fechaVencimiento: datos.fechaVencimiento ? new Date(datos.fechaVencimiento) : null,
          monedaId: BigInt(monedaId),
          montoDesembolsado: monto,
          tipoCambioAplicado: extranjera ? tc : null,
          saldoCapital: monto,
          capitalPagado: 0,
          estadoId: ESTADO.VIGENTE,
          observaciones: datos.observaciones || null,
          ...(usuarioId ? { creadoPor: BigInt(usuarioId) } : {}),
        });
      }

      const etiquetaOperacion =
        operacion === TIPOS_OPERACION.DESEMBOLSO
          ? sentido === SENTIDO.RECIBIDO
            ? `PRÉSTAMO RECIBIDO DEL PRESTAMISTA ${tipoContraparte}`
            : `PRÉSTAMO OTORGADO AL DEUDOR ${tipoContraparte}`
          : sentido === SENTIDO.RECIBIDO
            ? `DEVOLUCIÓN DE PRÉSTAMO AL PRESTAMISTA ${tipoContraparte}`
            : `DEVOLUCIÓN DE PRÉSTAMO DEL DEUDOR ${tipoContraparte}`;
      const descripcionMovimiento =
        (datos.descripcion && String(datos.descripcion).trim()) ||
        `${etiquetaOperacion} ${contraparte.razonSocial} - PRÉSTAMO N° ${prestamo.numeroPrestamo} - ${cuenta.banco?.nombre || "BANCO"} CTA. ${cuenta.numeroCuenta || cuenta.id}`;

      // ── 6. Movimientos de caja y saldos en cascada ──
      const crearMovimiento = async ({ data, ingreso = false, saldoAnteriorManual = null }) => {
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
            ingresos: ingreso ? data.monto : 0,
            egresos: ingreso ? 0 : data.monto,
            saldoActual: ingreso ? saldoAnterior + data.monto : saldoAnterior - data.monto,
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
        esGerencial,
        tipoCambio: tc,
        usuarioId: usuarioId ? Number(usuarioId) : null,
        moduloOrigenMotivoOperacionId: submoduloPrestamo?.id || null,
        fechaMotivoOperacion: new Date(),
        usuarioMotivoOperacionId: usuarioId ? Number(usuarioId) : null,
      };
      const principal = await crearMovimiento({
        ingreso: esIngreso,
        data: {
          ...baseMovimiento,
          tipoMovimientoId: tipoMovimiento.id,
          entidadComercialId: contraparte.id,
          monto,
          cuentaCorrienteDestinoId: cuenta.id,
          descripcion: descripcionMovimiento,
          numeroOperacionPagoBanco: numeroOperacion,
          fechaOperacionPagoBanco: fechaContable,
        },
      });
      const itfRegistro =
        itf > 0
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
      const comisionRegistro =
        comision > 0
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

      // ── 7. Registro del préstamo o del pago/cobro ──
      let pago = null;
      if (operacion === TIPOS_OPERACION.DESEMBOLSO) {
        await tx.prestamoEntidad.update({ where: { id: prestamo.id }, data: { movimientoCajaDesembolsoId: principal.movimiento.id } });
        await tx.movimientoCaja.update({ where: { id: principal.movimiento.id }, data: { origenMotivoOperacionId: prestamo.id } });
      } else {
        pago = await tx.pagoPrestamoEntidad.create({
          data: {
            prestamoEntidadId: prestamo.id,
            fechaPago: fechaContable,
            numeroOperacion,
            montoAplicado: Math.abs(num(prestamo.saldoCapital) - monto) <= TOLERANCIA ? r2(num(prestamo.saldoCapital)) : monto,
            monedaId: BigInt(monedaId),
            tipoCambio: tc,
            medioPagoId: BigInt(medioPago.id),
            movimientoCajaId: principal.movimiento.id,
            observaciones: datos.observaciones || null,
            refOperacionEspecializadaMovCaja: correlativo,
            fechaContable,
            periodoContableId: periodo.id,
            ...(usuarioId ? { creadoPor: BigInt(usuarioId) } : {}),
          },
        });
        await tx.movimientoCaja.update({ where: { id: principal.movimiento.id }, data: { origenMotivoOperacionId: pago.id } });
        await prestamoEntidadService.recalcularPrestamo(tx, prestamo.id);
      }

      // ── 8. Asientos (libro CAJA_BANCOS) ──
      const planPrestamo = cuentaPlan(codigoCuentaPrestamo);
      const lineaPrestamo = {
        planCuentaId: planPrestamo.id,
        debe: loanEnDebe ? aSoles(monto) : 0,
        haber: loanEnDebe ? 0 : aSoles(monto),
        debeME: loanEnDebe && extranjera ? monto : null,
        haberME: !loanEnDebe && extranjera ? monto : null,
        entidadComercialId: contraparte.id,
        numeroDocumentoOrigen: prestamo.numeroPrestamo,
        fechaDocumentoOrigen: prestamo.fechaDesembolso,
        fechaVenceDocumentoOrigen: prestamo.fechaVencimiento,
      };
      const lineaBanco = {
        planCuentaId: cuenta.cuentaContableId,
        debe: loanEnDebe ? 0 : aSoles(monto),
        haber: loanEnDebe ? aSoles(monto) : 0,
        debeME: !loanEnDebe && extranjera ? monto : null,
        haberME: loanEnDebe && extranjera ? monto : null,
        entidadComercialId: null,
      };
      const paramsAsiento = { empresaId, periodo, fecha: fechaContable, tipoLibroId: TIPO_LIBRO.CAJA_BANCOS, submodulo: submoduloMovCaja, tipoCambio: tc, usuarioId, esGerencial };
      const asientos = [
        await crearAsientoLetra(tx, {
          ...paramsAsiento,
          glosa: descripcionMovimiento,
          procesoOrigenId: principal.movimiento.id,
          monedaId: cuenta.monedaId,
          totalCabecera: monto,
          lineas: loanEnDebe ? [lineaPrestamo, lineaBanco] : [lineaBanco, lineaPrestamo],
        }),
      ];
      const asientoGasto = async (registro, importe, codigo, glosa) => {
        const c = cuentaPlan(codigo);
        return crearAsientoLetra(tx, {
          ...paramsAsiento,
          glosa,
          procesoOrigenId: registro.movimiento.id,
          monedaId: cuenta.monedaId,
          totalCabecera: importe,
          lineas: [
            { planCuentaId: c.id, debe: aSoles(importe), haber: 0, debeME: extranjera ? importe : null, centroCostoId: exigirCentroCosto(c) },
            { planCuentaId: cuenta.cuentaContableId, debe: 0, haber: aSoles(importe), haberME: extranjera ? importe : null },
          ],
        });
      };
      const referencia = `PRÉSTAMO N° ${prestamo.numeroPrestamo} - ${cuenta.banco?.nombre || "BANCO"} CTA. ${cuenta.numeroCuenta || cuenta.id} - OP. N° ${correlativo}`;
      if (itfRegistro) asientos.push(await asientoGasto(itfRegistro, itf, CODIGOS_CUENTAS_ITF_COMISION.ITF, `POR EL ITF - ${referencia}`));
      if (comisionRegistro) asientos.push(await asientoGasto(comisionRegistro, comision, CODIGOS_CUENTAS_ITF_COMISION.COMISIONES_BANCARIAS, `POR LA COMISIÓN BANCARIA - ${referencia}`));

      const movimientos = [principal.movimiento, itfRegistro?.movimiento, comisionRegistro?.movimiento].filter(Boolean);
      await tx.movimientoCaja.updateMany({ where: { id: { in: movimientos.map((m) => m.id) } }, data: { asientosGenerados: true } });

      // ── 9. Respuesta (misma forma que el resto de operaciones especializadas) ──
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
        [principal.movimiento.id]: esIngreso ? "Ingreso" : "Egreso",
        ...(itfRegistro && { [itfRegistro.movimiento.id]: "ITF" }),
        ...(comisionRegistro && { [comisionRegistro.movimiento.id]: "Comisión" }),
      };
      const saldos = await tx.saldoCuentaCorriente.findMany({
        where: { movimientoCajaId: { in: movimientos.map((m) => m.id) } },
        orderBy: { id: "asc" },
      });
      const prestamoFinal = await tx.prestamoEntidad.findUnique({ where: { id: prestamo.id } });
      const accion = operacion === TIPOS_OPERACION.DESEMBOLSO ? "Desembolso" : "Devolución";

      return {
        success: true,
        message: `${accion} del préstamo ${prestamo.numeroPrestamo} registrado exitosamente`,
        data: {
          operacion,
          sentido,
          esAccionista,
          prestamo: {
            id: prestamo.id,
            numeroPrestamo: prestamo.numeroPrestamo,
            contraparte: contraparte.razonSocial,
            tipoContraparte,
            montoDesembolsado: num(prestamoFinal.montoDesembolsado),
            saldoCapital: num(prestamoFinal.saldoCapital),
            simbolo: cuenta.moneda.simbolo,
          },
          correlativo: Number(correlativo),
          prestamoEntidadId: prestamo.id,
          pagoPrestamoEntidadId: pago?.id || null,
          numeroPrestamo: prestamo.numeroPrestamo,
          movimientoPrincipalId: principal.movimiento.id,
          movimientoITFId: itfRegistro?.movimiento.id || null,
          movimientoComisionId: comisionRegistro?.movimiento.id || null,
          movimientos: {
            principal: movimientosMap[principal.movimiento.id.toString()] || null,
            itf: itfRegistro ? movimientosMap[itfRegistro.movimiento.id.toString()] : null,
            comision: comisionRegistro ? movimientosMap[comisionRegistro.movimiento.id.toString()] : null,
          },
          saldosCuentaCorriente: saldos
            .filter((s) => etiquetas[s.movimientoCajaId.toString()])
            .map((s) => ({
              tipo: etiquetas[s.movimientoCajaId.toString()],
              movimientoCajaId: s.movimientoCajaId,
              saldoAnterior: Number(s.saldoAnterior),
              ingresos: Number(s.ingresos),
              egresos: Number(s.egresos),
              saldoActual: Number(s.saldoActual),
            })),
          asientosContables: asientos.map((a) => ({
            id: a.id,
            numeroAsiento: a.numeroAsiento,
            procesoOrigenId: a.procesoOrigenId,
            glosa: a.glosa,
            totalDebe: Number(a.totalDebe),
            totalHaber: Number(a.totalHaber),
            moneda: { id: cuenta.moneda.id, simbolo: cuenta.moneda.simbolo },
          })),
          resumen: {
            operacion,
            sentido,
            esAccionista,
            monto,
            itf,
            comision,
            saldoCapital: num(prestamoFinal.saldoCapital),
            estadoId: prestamoFinal.estadoId,
            prestamoCancelado: num(prestamoFinal.saldoCapital) <= 0,
          },
        },
      };
    }, { timeout: 60000 });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error de base de datos al procesar la operación del préstamo", err.message);
    throw err;
  }
}

/** Desembolso de un préstamo nuevo (ingreso si es recibido, egreso si es otorgado). */
export const procesarDesembolso = (datos) => procesar(datos, TIPOS_OPERACION.DESEMBOLSO);

/** Pago (préstamo recibido: egreso) o cobro (préstamo otorgado: ingreso) del capital de un préstamo vigente. */
export const procesarPago = (datos) => procesar(datos, TIPOS_OPERACION.PAGO);

export default { procesarDesembolso, procesarPago };
