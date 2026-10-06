// ════════════════════════════════════════════════════════════
// CONSTANTES DE ESTADOS DEL SISTEMA
// ════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────
// ESTADOS: ASIENTO CONTABLE
// ────────────────────────────────────────────────────────────
export const ESTADO_ASIENTO_CONTABLE = {
  PENDIENTE: 76,
  APROBADO: 77,
  ANULADO: 78,
};

// ────────────────────────────────────────────────────────────
// ESTADOS: CUENTAS POR PAGAR
// ────────────────────────────────────────────────────────────
export const ESTADO_CUENTA_POR_PAGAR = {
  PENDIENTE: 106,
  PAGO_PARCIAL: 107,
  PAGADO: 108,
  VENCIDO: 109,
  ANULADO: 110,
  CANJEADO: 111,
};

// ────────────────────────────────────────────────────────────
// ESTADOS: ORDEN DE COMPRA
// ────────────────────────────────────────────────────────────
export const ESTADO_ORDEN_COMPRA = {
  PENDIENTE: 38,
  APROBADO: 39,
  ANULADO: 40,
  KARDEX_GENERADO: 50,
  PARTICIONADA: 112,
  FACTURADA: 113,
};

// ────────────────────────────────────────────────────────────
// ESTADOS: PRE FACTURA
// ────────────────────────────────────────────────────────────
export const ESTADO_PREFACTURA = {
  PENDIENTE: 45,
  APROBADA: 46,
  ANULADA: 47,
  PARTICIONADA: 48,
  FACTURADA: 95,
  EMITIDA: 96,
  COMPROBANTE_ELECTRONICO_GENERADO: 97,
  VALIDADO_SUNAT: 98,
  NO_VALIDADO_SUNAT: 99,
};

// ────────────────────────────────────────────────────────────
// ESTADOS: CUENTA POR COBRAR
// ────────────────────────────────────────────────────────────
export const ESTADO_CUENTA_POR_COBRAR = {
  PENDIENTE: 100,
  PAGO_PARCIAL: 101,
  PAGADO: 102,
  VENCIDO: 103,
  ANULADO: 104,
  CANJEADO: 105,
};

// ────────────────────────────────────────────────────────────
// ESTADOS: DETRACCION
// ────────────────────────────────────────────────────────────
export const ESTADO_DETRACCION = {
  PENDIENTE: 126,
  VALIDADO: 127,
  ASIENTO_GENERADO: 128,
};

// ────────────────────────────────────────────────────────────
// ESTADOS: RETENCION
// ────────────────────────────────────────────────────────────
export const ESTADO_RETENCION = {
  PENDIENTE: 129,
  VALIDADO: 130,
  ASIENTO_GENERADO: 131,
};

// ────────────────────────────────────────────────────────────
// ESTADOS: PERCEPCION
// ────────────────────────────────────────────────────────────
export const ESTADO_PERCEPCION = {
  PENDIENTE: 132,
  VALIDADO: 133,
  ASIENTO_GENERADO: 134,
};

// ────────────────────────────────────────────────────────────
// ESTADOS: CUOTA DE PRÉSTAMO BANCARIO (tipo "CUOTAS PRESTAMO BANCARIO")
// ────────────────────────────────────────────────────────────
// SALDO_INICIAL queda en el catálogo pero no se asigna: una cuota histórica se guarda como PAGADO
// y se distingue con el flag saldoInicialPagada.
export const ESTADO_CUOTA_PRESTAMO = {
  PENDIENTE: 135,
  VENCIDO: 136,
  PAGO_PARCIAL: 137,
  PAGADO: 138,
  SALDO_INICIAL: 139,
};

// Cuotas con saldo por pagar (una cuota con pago parcial sigue abierta por su diferencia)
export const ESTADOS_CUOTA_PRESTAMO_ABIERTAS = [
  ESTADO_CUOTA_PRESTAMO.PENDIENTE,
  ESTADO_CUOTA_PRESTAMO.VENCIDO,
  ESTADO_CUOTA_PRESTAMO.PAGO_PARCIAL,
];

// ────────────────────────────────────────────────────────────
// TIPOS DE DOCUMENTO (para impuestos SUNAT)
// ────────────────────────────────────────────────────────────
export const TIPO_DOCUMENTO_SUNAT = {
  DETRACCION: 26,
  RETENCION: 27,
  PERCEPCION: 28,
};

// ────────────────────────────────────────────────────────────
// ESTADOS: PERIODO CONTABLE
// ────────────────────────────────────────────────────────────
export const ESTADO_PERIODO_CONTABLE = {
  ABIERTO: 73,      // Permite registrar asientos contables
  CERRADO: 74,      // No permite nuevos asientos (cierre mensual)
  BLOQUEADO: 75,    // Bloqueado definitivamente (después de declaración SUNAT)
};