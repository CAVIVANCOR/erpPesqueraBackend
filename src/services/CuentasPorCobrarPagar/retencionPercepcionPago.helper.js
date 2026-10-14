import { ValidationError } from "../../utils/errors.js";
import { ESTADO_RETENCION, ESTADO_PERCEPCION } from "../../utils/estados.constants.js";

/**
 * ════════════════════════════════════════════════════════════════════════════
 * RETENCIÓN Y PERCEPCIÓN EN EL PAGO / COBRO ESPECIALIZADO (patrón de la detracción)
 * ════════════════════════════════════════════════════════════════════════════
 *
 * La retención y la percepción son documentos que se generan junto con la PreFactura (venta) o la
 * Orden de Compra (compra), una sola vez por documento (Retencion.preFacturaId / ordenCompraId son
 * únicos), con su importe requerido, importe pagado, saldo y estado. Igual que la detracción, el pago
 * NO crea un documento nuevo: ACTUALIZA el existente.
 *
 *   importePagado    += importe aplicado en esta operación
 *   saldoPendiente    = importeRequerido - importePagado
 *   estadoPagoId      = PENDIENTE mientras haya saldo, VALIDADO cuando queda cubierto
 *   numeroDocumento   = número del comprobante de retención / percepción
 *   fechaEmision      = fecha del comprobante
 *
 * Diferencias con la detracción:
 *   - No mueve dinero hacia una cuenta del Banco de la Nación: no genera movimiento de caja propio.
 *   - Retención de compra (la empresa es agente): la CxP ya nace neta de retención y su asiento ya
 *     acreditó la cuenta de retenciones al registrar la compra; aquí solo se registra el comprobante.
 *   - Retención de venta (el cliente es agente): el comprobante lo entrega el cliente.
 *   - Percepción: forma parte del total del documento; aquí se registra su comprobante.
 *
 * El importe requerido del documento está en soles (se calcula sobre el total en soles). El importe
 * que informa el formulario viene en la moneda de la deuda: se convierte con el tipo de cambio del pago.
 *
 * Reversión: ver reversionOperacionCaja.service.js (resta lo que cada pago aplicó, con la misma conversión).
 */

const MONEDA_SOLES_ID = 1;
const TOLERANCIA_REDONDEO = 0.01;

const CONFIGURACION = {
  retencion: {
    delegado: "retencion",
    etiqueta: "retención",
    campoImporte: "importeRetenido",
    campoTipo: "tipoRetencionId",
    estados: ESTADO_RETENCION,
  },
  percepcion: {
    delegado: "percepcion",
    etiqueta: "percepción",
    campoImporte: "importePercibido",
    campoTipo: "tipoPercepcionId",
    estados: ESTADO_PERCEPCION,
  },
};

const redondear2 = (valor) => Math.round((Number(valor || 0) + Number.EPSILON) * 100) / 100;

/** Importe en la moneda de la deuda -> soles (moneda en la que está el importe requerido del documento). */
export const importeEnSoles = (importe, monedaDeudaId, tipoCambio) =>
  Number(monedaDeudaId) === MONEDA_SOLES_ID ? Number(importe) : Number(importe) * Number(tipoCambio);

async function aplicarAlDocumento({ tx, tipo, origen, documentoId, datos, monedaDeudaId, tipoCambio }) {
  const config = CONFIGURACION[tipo];

  if (!documentoId) {
    throw new ValidationError(`El documento no tiene ${config.etiqueta} generada: no se puede registrar el comprobante.`);
  }

  const documento = await tx[config.delegado].findUnique({
    where: origen === "VENTA" ? { preFacturaId: documentoId } : { ordenCompraId: documentoId },
  });
  if (!documento) {
    throw new ValidationError(
      `El documento no tiene una ${config.etiqueta} generada: no se puede registrar el comprobante de ${config.etiqueta}.`,
    );
  }

  const importeInformado = Number(datos[config.campoImporte]);
  if (!(importeInformado > 0)) {
    throw new ValidationError(`El importe de la ${config.etiqueta} debe ser mayor a cero.`);
  }

  const saldoActual = Number(documento.saldoPendiente);
  if (saldoActual <= TOLERANCIA_REDONDEO) {
    throw new ValidationError(`La ${config.etiqueta} de este documento ya fue registrada en su totalidad.`);
  }

  const aplicado = redondear2(Math.min(importeEnSoles(importeInformado, monedaDeudaId, tipoCambio), saldoActual));
  const nuevoPagado = redondear2(Number(documento.importePagado) + aplicado);
  const nuevoSaldo = Math.max(0, redondear2(Number(documento.importeRequerido) - nuevoPagado));
  const cubierta = nuevoSaldo <= TOLERANCIA_REDONDEO;

  const actualizado = await tx[config.delegado].update({
    where: { id: documento.id },
    data: {
      importePagado: nuevoPagado,
      saldoPendiente: nuevoSaldo,
      estadoPagoId: cubierta ? config.estados.VALIDADO : config.estados.PENDIENTE,
      numeroDocumento: datos.numeroDocumento || documento.numeroDocumento,
      fechaEmision: datos.fechaEmision ? new Date(datos.fechaEmision) : documento.fechaEmision,
      ...(datos[config.campoTipo] && !documento[config.campoTipo] ? { [config.campoTipo]: Number(datos[config.campoTipo]) } : {}),
    },
  });

  // El formulario de confirmación muestra el importe de esta operación (en la moneda de la deuda)
  return { ...actualizado, [config.campoImporte]: importeInformado, importeAplicadoSoles: aplicado };
}

/**
 * Registra la retención y/o percepción de un pago o cobro especializado.
 *
 * @param {Object} params
 * @param {Object} params.tx - Transacción de Prisma
 * @param {Object} params.data - Datos del pago (aplicaRetencion, retencion, aplicaPercepcion, percepcion, tipoCambio)
 * @param {"VENTA"|"COMPRA"} params.origen - VENTA: PreFactura/CxC; COMPRA: OrdenCompra/CxP
 * @param {BigInt|number} params.documentoId - preFacturaId (venta) u ordenCompraId (compra) de la deuda
 * @param {BigInt|number} params.monedaDeudaId - moneda de la deuda
 * @returns {Promise<{retencion: Object|null, percepcion: Object|null}>}
 */
export async function registrarRetencionPercepcionDelPago({ tx, data, origen, documentoId, monedaDeudaId }) {
  const comunes = { tx, origen, documentoId, monedaDeudaId, tipoCambio: data.tipoCambio };

  const retencion =
    data.aplicaRetencion && data.retencion
      ? await aplicarAlDocumento({ ...comunes, tipo: "retencion", datos: data.retencion })
      : null;

  const percepcion =
    data.aplicaPercepcion && data.percepcion
      ? await aplicarAlDocumento({ ...comunes, tipo: "percepcion", datos: data.percepcion })
      : null;

  return { retencion, percepcion };
}

export default { registrarRetencionPercepcionDelPago, importeEnSoles };
