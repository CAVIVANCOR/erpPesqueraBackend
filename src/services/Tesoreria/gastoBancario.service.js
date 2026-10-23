import prisma from "../../config/prismaClient.js";
import { NotFoundError, ValidationError, DatabaseError } from "../../utils/errors.js";
import correlativoService from "./correlativoOperacionCaja.service.js";
import { TIPO_LIBRO } from "../../utils/tiposLibroContable.js";
import { entidadDeBanco } from "../../utils/entidadBanco.js";
import { CONCEPTOS_GASTO_BANCARIO } from "../../utils/gastoBancario.constants.js";
import { MONEDA_SOLES_ID, TIPO_MOVIMIENTO_ITF_COMISION, ESTADO_MOVIMIENTO_CAJA_VALIDADO } from "../../utils/letrasCambio.constants.js";
import { obtenerCuentas, exigirCentroCosto, obtenerPeriodoAbierto, crearAsientoLetra } from "./letraCambioBase.service.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: REGISTRO ESPECIALIZADO DE GASTOS BANCARIOS
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Cargos que el banco hace a la cuenta sin que nazcan de otra operación (comisión de mantenimiento, comisión por
 * retención judicial, ITF, portes...). Sin cuenta por pagar ni comprobante: nacen directo en caja y contabilidad.
 *
 * Una operación (un correlativo) puede tener varias líneas; cada línea es un EGRESO de caja aparte (tipo de
 * movimiento ITF/COMISIÓN) con su saldo en cascada y su asiento:
 *     DEBE 679401 (comisiones) o 641101 (ITF)  ·  HABER cuenta contable del banco de la cuenta corriente elegida
 * El ITF y la comisión nunca se restan de otro monto: siempre son movimientos aparte.
 */

const num = (v) => Number(v || 0);
const r2 = (v) => Math.round(num(v) * 100) / 100;
const aBooleano = (valor) => (typeof valor === "string" ? valor === "true" : Boolean(valor));

export const listarConceptos = () =>
  Object.entries(CONCEPTOS_GASTO_BANCARIO).map(([codigo, c]) => ({ codigo, etiqueta: c.etiqueta, cuenta: c.cuenta }));

export async function registrar(datos) {
  const { empresaId, cuentaCorrienteId, medioPagoId, fecha, usuarioId } = datos;
  try {
    if (!empresaId) throw new ValidationError("Seleccione la empresa del gasto bancario.");
    if (!cuentaCorrienteId) throw new ValidationError("Seleccione la cuenta corriente donde el banco hizo el cargo.");
    if (!medioPagoId) throw new ValidationError("Seleccione el medio de pago.");
    if (!fecha) throw new ValidationError("Indique la fecha del cargo del banco.");
    const lineas = Array.isArray(datos.lineas) ? datos.lineas : [];
    if (lineas.length === 0) throw new ValidationError("Agregue al menos un gasto bancario (concepto y monto).");
    lineas.forEach((l, i) => {
      if (!CONCEPTOS_GASTO_BANCARIO[l.concepto]) throw new ValidationError(`La línea ${i + 1} no tiene un concepto válido de gasto bancario.`);
      if (!(r2(l.monto) > 0)) throw new ValidationError(`El monto de la línea ${i + 1} (${CONCEPTOS_GASTO_BANCARIO[l.concepto].etiqueta}) debe ser mayor a cero.`);
    });

    return await prisma.$transaction(async (tx) => {
      const empresa = await tx.empresa.findUnique({ where: { id: Number(empresaId) }, select: { id: true, razonSocial: true } });
      if (!empresa) throw new NotFoundError("La empresa indicada no existe.");

      const cuenta = await tx.cuentaCorriente.findUnique({
        where: { id: Number(cuentaCorrienteId) },
        include: { banco: { select: { id: true, nombre: true } }, moneda: { select: { id: true, simbolo: true, codigoSunat: true } } },
      });
      if (!cuenta) throw new NotFoundError("Cuenta corriente no encontrada.");
      if (Number(cuenta.empresaId) !== Number(empresa.id)) {
        throw new ValidationError(`La cuenta corriente no pertenece a ${empresa.razonSocial}. Elija una cuenta de esa empresa.`);
      }
      if (!cuenta.cuentaContableId) {
        throw new ValidationError(`La cuenta corriente ${cuenta.numeroCuenta || cuenta.id} no tiene cuenta contable asociada. Asígnela en el mantenimiento de cuentas corrientes.`);
      }
      const medioPago = await tx.medioPago.findUnique({ where: { id: Number(medioPagoId) } });
      if (!medioPago) throw new NotFoundError("Medio de pago no encontrado.");
      const tipoMovimiento = await tx.tipoMovEntregaRendir.findFirst({ where: { id: TIPO_MOVIMIENTO_ITF_COMISION, activo: true } });
      if (!tipoMovimiento) {
        throw new ValidationError(`No existe o está inactivo el tipo de movimiento de caja ITF / COMISIÓN (id ${TIPO_MOVIMIENTO_ITF_COMISION}), necesario para registrar gastos bancarios.`);
      }
      if (tipoMovimiento.esIngreso) {
        throw new ValidationError(`El tipo de movimiento "${tipoMovimiento.nombre}" (id ${TIPO_MOVIMIENTO_ITF_COMISION}) está configurado como ingreso: los gastos bancarios son egresos de caja.`);
      }

      const monedaId = Number(cuenta.monedaId);
      const extranjera = monedaId !== MONEDA_SOLES_ID;
      const tc = extranjera ? num(datos.tipoCambio) : 1;
      if (extranjera && !(tc > 0)) throw new ValidationError("Ingrese el tipo de cambio de la fecha para convertir los gastos a soles.");
      const aSoles = (importe) => (extranjera ? r2(importe * tc) : r2(importe));

      const codigos = [...new Set(lineas.map((l) => CONCEPTOS_GASTO_BANCARIO[l.concepto].cuenta))];
      const cuentaPlan = await obtenerCuentas(tx, codigos);

      const submoduloMovCaja = await tx.submoduloSistema.findFirst({ where: { nombreModeloOrigen: "MovimientoCaja", activo: true } });
      if (!submoduloMovCaja) throw new ValidationError('No se encontró el submódulo "MovimientoCaja".');

      const esGerencial = aBooleano(datos.esGerencial);
      const fechaContable = new Date(fecha);
      const correlativo = await correlativoService.generarCorrelativo(empresa.id, tx);
      const periodo = await obtenerPeriodoAbierto(tx, empresa.id, fechaContable, empresa.razonSocial);
      const numeroOperacion = datos.numeroOperacion ? String(datos.numeroOperacion).slice(0, 40) : null;
      const glosaGeneral = datos.descripcion ? String(datos.descripcion).trim() : "";
      const bancoEntidad = entidadDeBanco(cuenta.banco);

      const baseMovimiento = {
        refOperacionEspecializadaMovCaja: correlativo,
        empresaId: Number(empresa.id),
        monedaId: cuenta.monedaId,
        medioPagoId: Number(medioPagoId),
        fechaOperacionMovCaja: fechaContable,
        estadoId: ESTADO_MOVIMIENTO_CAJA_VALIDADO,
        esGerencial,
        tipoCambio: tc,
        usuarioId: usuarioId ? Number(usuarioId) : null,
        fechaMotivoOperacion: new Date(),
        usuarioMotivoOperacionId: usuarioId ? Number(usuarioId) : null,
        tipoMovimientoId: tipoMovimiento.id,
        entidadComercialId: bancoEntidad,
        cuentaCorrienteOrigenId: cuenta.id,
        numeroOperacionPagoBanco: numeroOperacion,
        fechaOperacionPagoBanco: fechaContable,
      };
      const paramsAsiento = { empresaId: Number(empresa.id), periodo, fecha: fechaContable, tipoLibroId: TIPO_LIBRO.CAJA_BANCOS, submodulo: submoduloMovCaja, tipoCambio: tc, usuarioId, esGerencial };
      const referencia = `${cuenta.banco?.nombre || "BANCO"} CTA. ${cuenta.numeroCuenta || cuenta.id} - OP. N° ${correlativo}`;

      // ── Una línea = un egreso de caja (saldo en cascada) + su asiento ──
      let saldoAnterior = null;
      const registros = [];
      for (const linea of lineas) {
        const concepto = CONCEPTOS_GASTO_BANCARIO[linea.concepto];
        const monto = r2(linea.monto);
        const detalle = [concepto.etiqueta, (linea.glosa && String(linea.glosa).trim()) || glosaGeneral].filter(Boolean).join(" - ");

        const movimiento = await tx.movimientoCaja.create({
          data: { ...baseMovimiento, monto, descripcion: `${concepto.prefijo} - ${detalle}` },
        });
        if (saldoAnterior === null) {
          const ultimo = await tx.saldoCuentaCorriente.findFirst({ where: { cuentaCorrienteId: cuenta.id }, orderBy: [{ fecha: "desc" }, { id: "desc" }] });
          saldoAnterior = ultimo ? Number(ultimo.saldoActual) : 0;
        }
        const saldo = await tx.saldoCuentaCorriente.create({
          data: {
            cuentaCorrienteId: cuenta.id,
            empresaId: cuenta.empresaId,
            fecha: fechaContable,
            saldoAnterior,
            ingresos: 0,
            egresos: monto,
            saldoActual: saldoAnterior - monto,
            movimientoCajaId: movimiento.id,
            centroCostoId: null,
            conciliado: false,
          },
        });
        saldoAnterior = Number(saldo.saldoActual);

        const plan = cuentaPlan(concepto.cuenta);
        const asiento = await crearAsientoLetra(tx, {
          ...paramsAsiento,
          glosa: `${concepto.glosaAsiento} - ${detalle} - ${referencia}`,
          procesoOrigenId: movimiento.id,
          monedaId: cuenta.monedaId,
          totalCabecera: monto,
          lineas: [
            { planCuentaId: plan.id, debe: aSoles(monto), haber: 0, debeME: extranjera ? monto : null, centroCostoId: exigirCentroCosto(plan) },
            { planCuentaId: cuenta.cuentaContableId, debe: 0, haber: aSoles(monto), haberME: extranjera ? monto : null },
          ],
        });
        registros.push({ linea, concepto, monto, movimiento, saldo, asiento });
      }

      await tx.movimientoCaja.updateMany({ where: { id: { in: registros.map((r) => r.movimiento.id) } }, data: { asientosGenerados: true } });

      // ── Respuesta (misma forma que el resto de operaciones especializadas) ──
      const completos = await tx.movimientoCaja.findMany({
        where: { id: { in: registros.map((r) => r.movimiento.id) } },
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
      const porId = Object.fromEntries(completos.map((m) => [m.id.toString(), m]));
      const total = r2(registros.reduce((a, r) => a + r.monto, 0));

      return {
        success: true,
        message: `Gastos bancarios registrados exitosamente (operación N° ${correlativo}): ${cuenta.moneda.simbolo} ${total.toFixed(2)}`,
        data: {
          correlativo: Number(correlativo),
          empresa: { id: empresa.id, razonSocial: empresa.razonSocial },
          cuenta: { id: cuenta.id, numeroCuenta: cuenta.numeroCuenta, banco: cuenta.banco?.nombre || null, moneda: cuenta.moneda },
          lineas: registros.map((r) => ({
            concepto: r.linea.concepto,
            etiqueta: r.concepto.etiqueta,
            cuentaGasto: r.concepto.cuenta,
            monto: r.monto,
            movimientoCajaId: r.movimiento.id,
            movimiento: porId[r.movimiento.id.toString()] || null,
            saldo: {
              saldoAnterior: Number(r.saldo.saldoAnterior),
              ingresos: Number(r.saldo.ingresos),
              egresos: Number(r.saldo.egresos),
              saldoActual: Number(r.saldo.saldoActual),
            },
            asiento: {
              id: r.asiento.id,
              numeroAsiento: r.asiento.numeroAsiento,
              procesoOrigenId: r.asiento.procesoOrigenId,
              glosa: r.asiento.glosa,
              totalDebe: Number(r.asiento.totalDebe),
              totalHaber: Number(r.asiento.totalHaber),
            },
          })),
          movimientoPrincipalId: registros[0].movimiento.id,
          movimientoIds: registros.map((r) => r.movimiento.id),
          resumen: { total, lineas: registros.length, esGerencial, saldoFinalCuenta: saldoAnterior },
        },
      };
    }, { timeout: 60000 });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof NotFoundError) throw err;
    if (err.code && String(err.code).startsWith("P")) throw new DatabaseError("Error de base de datos al registrar los gastos bancarios", err.message);
    throw err;
  }
}

export default { registrar, listarConceptos };
