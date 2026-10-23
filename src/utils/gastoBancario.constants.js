import { CODIGOS_CUENTAS_ITF_COMISION } from "./letrasCambio.constants.js";

/**
 * Conceptos del registro especializado de Gastos Bancarios (cargos del banco que no nacen de otra operación).
 * Cada concepto va a una cuenta de gasto; el prefijo de la descripción del movimiento (ITF / COMISIÓN) sigue la
 * convención que ya usan las demás operaciones para identificar estos cargos.
 */
export const CONCEPTOS_GASTO_BANCARIO = {
  COMISION_MANTENIMIENTO: {
    etiqueta: "Comisión de mantenimiento de cuenta",
    cuenta: CODIGOS_CUENTAS_ITF_COMISION.COMISIONES_BANCARIAS,
    prefijo: "COMISIÓN",
    glosaAsiento: "POR LA COMISIÓN BANCARIA",
  },
  COMISION_RETENCION_JUDICIAL: {
    etiqueta: "Comisión por retención judicial",
    cuenta: "679404",
    prefijo: "COMISIÓN",
    glosaAsiento: "POR LA COMISIÓN BANCARIA",
  },
  COMISION_TRANSFERENCIA: {
    etiqueta: "Comisión por transferencia u operación bancaria",
    cuenta: CODIGOS_CUENTAS_ITF_COMISION.COMISIONES_BANCARIAS,
    prefijo: "COMISIÓN",
    glosaAsiento: "POR LA COMISIÓN BANCARIA",
  },
  COMISION_OTROS: {
    etiqueta: "Otras comisiones y portes",
    cuenta: CODIGOS_CUENTAS_ITF_COMISION.COMISIONES_BANCARIAS,
    prefijo: "COMISIÓN",
    glosaAsiento: "POR LA COMISIÓN BANCARIA",
  },
  ITF: {
    etiqueta: "ITF (Impuesto a las Transacciones Financieras)",
    cuenta: CODIGOS_CUENTAS_ITF_COMISION.ITF,
    prefijo: "ITF",
    glosaAsiento: "POR EL ITF",
  },
};
