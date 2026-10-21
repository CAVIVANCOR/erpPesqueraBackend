// ════════════════════════════════════════════════════════════
// CONSTANTES: PRÉSTAMOS CON ACCIONISTAS Y TERCEROS (bidireccional, solo capital)
// ════════════════════════════════════════════════════════════

// RECIBIDO: la empresa es la deudora. OTORGADO: la empresa es la acreedora.
export const SENTIDO_PRESTAMO_ENTIDAD = {
  RECIBIDO: "RECIBIDO",
  OTORGADO: "OTORGADO",
};

export const PREFIJO_NUMERO_PRESTAMO_ENTIDAD = "PE";

// Submódulo (ruta) con el que se vinculan los movimientos de caja de la operación (opcional)
export const RUTA_SUBMODULO_PRESTAMO_ENTIDAD = "prestamoEntidad";

// Cuentas del plan contable por sentido, tipo de contraparte y moneda (1 = soles, 2 = dólares).
//   RECIBIDO : DESEMBOLSO = DEBE banco / HABER cuenta por pagar ; PAGO  = DEBE cuenta por pagar / HABER banco
//   OTORGADO : DESEMBOLSO = DEBE cuenta por cobrar / HABER banco ; COBRO = DEBE banco / HABER cuenta por cobrar
export const CUENTAS_PRESTAMO_ENTIDAD = {
  RECIBIDO: {
    accionista: { 1: "441111", 2: "441112" },
    tercero: { 1: "461101", 2: "461102" },
  },
  OTORGADO: {
    accionista: { 1: "142211", 2: "142212" },
    tercero: { 1: "161111", 2: "161112" },
  },
};
