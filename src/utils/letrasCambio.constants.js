// ════════════════════════════════════════════════════════════
// CONSTANTES: LETRAS DE CAMBIO (compras = PAGAR, ventas = COBRAR)
// ════════════════════════════════════════════════════════════

export const TIPO_LETRA = {
  PAGAR: "PAGAR",
  COBRAR: "COBRAR",
};

// El protesto se produce a los 7 días hábiles (lunes a viernes) después del vencimiento
export const DIAS_HABILES_PROTESTO = 7;

export const MONEDA_SOLES_ID = 1;

// Los estados de las letras se buscan (y se crean si faltan) por descripción dentro de este tipo
export const TIPO_PROVIENE_DE_LETRA = "LETRAS DE CAMBIO";
export const ESTADOS_LETRA = {
  VIGENTE: { descripcion: "VIGENTE", severityColor: "info" },
  VENCIDA: { descripcion: "VENCIDA", severityColor: "warning" },
  PROTESTADA: { descripcion: "PROTESTADA", severityColor: "danger" },
  PAGADA_PARCIAL: { descripcion: "PAGADA PARCIAL", severityColor: "warning" },
  PAGADA: { descripcion: "PAGADA", severityColor: "success" },
  REFINANCIADA: { descripcion: "REFINANCIADA", severityColor: "secondary" },
  ANULADA: { descripcion: "ANULADA", severityColor: "danger" },
};

// Letra de cambio como tipo de documento propio (numeración LP-000001 / LC-000001)
export const TIPO_DOCUMENTO_LETRA = { codigo: "LET", descripcion: "LETRA DE CAMBIO" };
export const PREFIJO_NUMERO_LETRA = { PAGAR: "LP", COBRAR: "LC" };

export const MEDIO_PAGO_CANJE_LETRA = "CANJE POR LETRA";

// Submódulo (ruta) con el que se vinculan los asientos del canje a la letra (procesoOrigenId = id de la letra)
export const RUTA_SUBMODULO_LETRA = "letra-cambio";

// Cuentas del plan contable por moneda (1 = soles, 2 = dólares).
//   PAGAR : DEBE facturas por pagar emitidas / HABER letras por pagar (canje); el pago carga letras por pagar,
//           intereses y mora (gasto financiero) contra el banco.
//   COBRAR: DEBE letras por cobrar en cartera / HABER facturas por cobrar emitidas (canje); el cobro abona
//           letras por cobrar, intereses y mora (ingreso financiero) contra el banco.
export const CUENTAS_LETRA = {
  PAGAR: {
    documento: { 1: "421201", 2: "421202" },
    letra: { 1: "423101", 2: "423102" },
    interes: "673111",
    mora: "679403",
  },
  COBRAR: {
    documento: { 1: "121201", 2: "121202" },
    letra: { 1: "123201", 2: "123202" },
    interes: "772101",
    mora: "7791",
  },
};

// ITF y comisión comparten tipo de movimiento y cuentas con el resto de pagos de Tesorería
export const TIPO_MOVIMIENTO_ITF_COMISION = 163;
export const CODIGOS_CUENTAS_ITF_COMISION = { ITF: "641101", COMISIONES_BANCARIAS: "679401" };
export const ESTADO_MOVIMIENTO_CAJA_VALIDADO = 21;
