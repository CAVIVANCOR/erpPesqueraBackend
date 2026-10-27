import { ValidationError } from "../../utils/errors.js";
import { CUENTAS_WARRANT } from "../../utils/warrant.constants.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * SERVICIO: WARRANT (préstamo con garantía de mercadería en un AGD) - [CASO E]
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Aquí viven SOLO los asientos propios del Warrant. El movimiento de caja, el asiento del
 * capital, el ITF y la comisión los registra operacionPrestamo.service.js igual que en
 * cualquier préstamo (con la cuenta 454915 / 454916, ver obtenerCuentaCapital).
 *
 * Un Warrant lleva el pasivo por el BRUTO (capital + interés) y devenga el gasto al pagar:
 *
 *   DESEMBOLSO  (además del DEBE banco / HABER 454915 por el capital)
 *               DEBE 373101 / HABER 454915-454916   intereses totales del cronograma, sin caja
 *   PAGO CUOTA  (además del DEBE 454915-454916 capital + interés / HABER banco)
 *               DEBE 673111 / HABER 373101          devengo del interés que cubre ese pago, sin caja
 *
 * Ninguna función de este archivo escribe en la base: solo validan y ARMAN los parámetros del
 * asiento. Quien llama los pasa a `crearAsiento` de operacionPrestamo.service.js. Así se evita
 * el import circular y los asientos nacen ligados al movimiento de caja de la operación
 * (por eso la reversión por operación los elimina sin lógica propia).
 *
 * El traslado de mercadería al AGD y su reingreso (281101 / 201111) es de Almacén: no se hace aquí.
 */

const aCentimos = (valor) => Math.round(Number(valor || 0) * 100);

/**
 * Asiento de los intereses totales del cronograma, sin caja (se registra al desembolsar).
 * DEBE 373101 intereses no devengados / HABER 454915-454916 préstamo Warrant.
 *
 * @param {Object} tx Transacción de Prisma
 * @param {Object} args
 * @param {Object} args.prestamo Préstamo con `banco`
 * @param {Object} args.ctx Contexto de operacionPrestamo.service.js (tercero prestamista)
 * @param {Object} args.ingreso Resultado de `registrarMovimiento` del desembolso (el asiento se liga a su movimiento)
 * @param {Object} args.cuentaPasivo Cuenta 454915-454916 (la misma del capital)
 * @param {Function} args.obtenerCuentaPorCodigo Busca una cuenta del plan por código (inyectada para evitar el import circular)
 * @returns {Promise<Object>} Parámetros para `crearAsiento` (movimiento, lineasDebe, lineasHaber, glosa)
 */
export async function armarAsientoInteresesNoDevengados(tx, { prestamo, ctx, ingreso, cuentaPasivo, obtenerCuentaPorCodigo }) {
  const cuotas = await tx.cuotaPrestamo.findMany({
    where: { prestamoBancarioId: prestamo.id },
    select: { montoInteres: true },
  });
  const totalIntereses = cuotas.reduce((suma, cuota) => suma + aCentimos(cuota.montoInteres), 0) / 100;
  // Sin intereses no hay nada que diferir: se rechaza para no dejar un pasivo sin su contrapartida (373101)
  if (!(totalIntereses > 0)) {
    throw new ValidationError(
      `El Warrant ${prestamo.numeroPrestamo} no tiene intereses en su cronograma: genere las cuotas con sus intereses antes de desembolsar, ` +
        `para registrar los intereses no devengados (${CUENTAS_WARRANT.interesesNoDevengados}).`,
    );
  }

  const cuentaInteresesNoDevengados = await obtenerCuentaPorCodigo(tx, CUENTAS_WARRANT.interesesNoDevengados);
  return {
    // El asiento toma su monto del movimiento: se usa el del ingreso con el monto de los intereses
    movimiento: { ...ingreso.movimiento, monto: totalIntereses },
    lineasDebe: [{ cuentaId: cuentaInteresesNoDevengados.id, monto: totalIntereses, entidadComercialId: ctx.entidadPrestamista }],
    lineasHaber: [
      {
        cuentaId: cuentaPasivo.id,
        monto: totalIntereses,
        entidadComercialId: ctx.entidadPrestamista,
        procesoId: prestamo.id,
        documento: {
          numeroDocumentoOrigen: prestamo.numeroPrestamo,
          fechaDocumentoOrigen: prestamo.fechaDesembolso,
          fechaVenceDocumentoOrigen: prestamo.fechaVencimiento,
        },
      },
    ],
    glosa: `POR LOS INTERESES NO DEVENGADOS DEL WARRANT ${prestamo.banco.nombre} - PRESTAMO ${prestamo.numeroPrestamo}`,
  };
}

/**
 * Asiento del devengo del interés que cubre un pago de cuotas, sin caja.
 * DEBE 673111 gasto por intereses / HABER 373101 intereses no devengados.
 *
 * @param {Object} tx Transacción de Prisma
 * @param {Object} args
 * @param {Object} args.prestamo Préstamo con `banco`
 * @param {Object} args.ctx Contexto de operacionPrestamo.service.js (tercero prestamista)
 * @param {Object} args.egreso Resultado de `registrarMovimiento` del pago (el asiento se liga a su movimiento)
 * @param {number} args.montoInteres Interés imputado en ESTE pago (suma de las cuotas pagadas)
 * @param {string} args.numerosCuota Cuotas del pago, para la glosa
 * @param {Function} args.obtenerCuentaPorCodigo Busca una cuenta del plan por código (inyectada para evitar el import circular)
 * @returns {Promise<Object|null>} Parámetros para `crearAsiento`, o null si el pago no cubre interés (solo comisión/seguro)
 */
export async function armarAsientoDevengoIntereses(tx, { prestamo, ctx, egreso, montoInteres, numerosCuota, obtenerCuentaPorCodigo }) {
  if (!(montoInteres > 0)) return null;

  const [cuentaGastoIntereses, cuentaInteresesNoDevengados] = await Promise.all([
    obtenerCuentaPorCodigo(tx, CUENTAS_WARRANT.gastoIntereses),
    obtenerCuentaPorCodigo(tx, CUENTAS_WARRANT.interesesNoDevengados),
  ]);
  return {
    movimiento: { ...egreso.movimiento, monto: montoInteres },
    lineasDebe: [
      {
        cuentaId: cuentaGastoIntereses.id,
        monto: montoInteres,
        centroCostoId: cuentaGastoIntereses.centroCostoId ?? null,
        entidadComercialId: ctx.entidadPrestamista,
      },
    ],
    lineasHaber: [{ cuentaId: cuentaInteresesNoDevengados.id, monto: montoInteres, entidadComercialId: ctx.entidadPrestamista }],
    glosa: `POR EL DEVENGO DE LOS INTERESES DEL WARRANT ${prestamo.banco.nombre} - PRESTAMO ${prestamo.numeroPrestamo} CUOTA(S) ${numerosCuota}`,
  };
}

export default {
  armarAsientoInteresesNoDevengados,
  armarAsientoDevengoIntereses,
};
