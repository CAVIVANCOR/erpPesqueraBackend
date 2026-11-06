/**
 * Rutinas del sistema para conceptos cuyo cálculo no se puede expresar con una fórmula simple
 * (ConceptoPlanilla.claveMotor). Cada rutina recibe las variables del trabajador y devuelve el monto.
 *
 * Las variables PENSION_* salen de la tarifa vigente de la entidad de pensión del trabajador; BASE_AFP es la suma
 * de los ingresos marcados "Base AFP/ONP" que se calcularon antes (por eso esos conceptos deben tener menor orden).
 */

const baseConTope = (v) => (v.REM_MAX_ASEGURABLE > 0 ? Math.min(v.BASE_AFP, v.REM_MAX_ASEGURABLE) : v.BASE_AFP);

/**
 * Renta de 5ta categoría (Ley del Impuesto a la Renta, arts. 46 y 53; Reglamento, art. 40; procedimiento SUNAT).
 * Se fijan por ley, por eso van aquí y no como parámetros: deducción de 7 UIT y la escala progresiva acumulativa.
 */
const UIT_DEDUCIBLES_5TA = 7;
const TRAMOS_5TA = [
  { hastaUit: 5, tasa: 8 },
  { hastaUit: 20, tasa: 14 },
  { hastaUit: 35, tasa: 17 },
  { hastaUit: 45, tasa: 20 },
  { hastaUit: Infinity, tasa: 30 },
];
// Divisor del impuesto pendiente según el mes; diciembre es la regularización (se paga todo el saldo)
const DIVISOR_5TA_POR_MES = { 1: 12, 2: 12, 3: 12, 4: 9, 5: 8, 6: 8, 7: 8, 8: 5, 9: 4, 10: 4, 11: 4, 12: 1 };

function impuestoAnual5ta(rentaNeta, uit) {
  let impuesto = 0;
  let desde = 0;
  for (const { hastaUit, tasa } of TRAMOS_5TA) {
    const hasta = hastaUit * uit;
    if (rentaNeta > desde) impuesto += ((Math.min(rentaNeta, hasta) - desde) * tasa) / 100;
    desde = hasta;
  }
  return impuesto;
}

/**
 * Retención mensual de 5ta (procedimiento SUNAT):
 *  1. Remuneración bruta anual = ordinaria mensual × meses que faltan (incluye el mes) + gratificaciones por percibir
 *     (julio y diciembre) + lo ya puesto a disposición en los meses anteriores + ingresos extraordinarios del mes.
 *  2. Se restan 7 UIT y se aplica la escala → impuesto anual proyectado.
 *  3. (Impuesto anual − retenciones de meses anteriores) ÷ divisor del mes. En diciembre se descuenta todo el saldo,
 *     ya con los ingresos reales, por lo que ajusta el año.
 * Si la planilla no es mensual, se retiene la fracción DIAS / DIAS_BASE_MES del monto del mes.
 * No considera ingresos de otros empleadores ni créditos; no devuelve saldo a favor (si es negativo, retiene 0).
 * El concepto debe tener mayor orden que los ingresos para que BASE_QUINTA ya esté completa.
 */
function retencionQuinta(v) {
  if (v.ES_LOCACION) return 0;
  if (!(v.UIT > 0)) throw new Error('falta el parámetro legal UIT vigente');
  const mensualizado =
    v.PERIODICIDAD_DIAS === 30 || v.DIAS <= 0 ? v.BASE_QUINTA_ORDINARIA : v.BASE_QUINTA_ORDINARIA * (v.DIAS_BASE_MES / v.DIAS);
  const mesesRestantes = 13 - v.MES;
  const gratificacionesPorPercibir = (v.MES < 7 ? 1 : 0) + (v.MES < 12 ? 1 : 0);
  const bonificacion = v.BONIFICACION_EXTRAORDINARIA_APLICA ? (v.BONIFICACION_EXTRAORDINARIA_PORCENTAJE || 0) / 100 : 0;
  const gratificacion = mensualizado * (v.GRATIFICACION_REMUNERACIONES || 0) * (1 + bonificacion);
  const extraordinariosDelMes = v.BASE_QUINTA - v.BASE_QUINTA_ORDINARIA;

  const brutaAnual =
    mensualizado * mesesRestantes + gratificacion * gratificacionesPorPercibir + v.INGRESOS_ANTERIORES_5TA + extraordinariosDelMes;
  const rentaNeta = brutaAnual - UIT_DEDUCIBLES_5TA * v.UIT;
  if (rentaNeta <= 0) return 0;

  const pendiente = impuestoAnual5ta(rentaNeta, v.UIT) - v.RETENCIONES_ANTERIORES_5TA;
  if (pendiente <= 0) return 0;
  const retencionMes = pendiente / DIVISOR_5TA_POR_MES[v.MES];
  return v.PERIODICIDAD_DIAS === 30 ? retencionMes : retencionMes * Math.min(1, v.DIAS / v.DIAS_BASE_MES);
}

export const RUTINAS_PLANILLA = {
  /** Aporte al fondo de pensiones (AFP) o aporte ONP, según la entidad del trabajador. */
  PENSION_APORTE: (v) => (v.TIENE_PENSION ? (baseConTope(v) * v.PENSION_APORTE) / 100 : 0),
  /** Prima de seguro de la AFP (la ONP no tiene). */
  PENSION_SEGURO: (v) => (v.TIENE_PENSION && !v.ES_ONP ? (baseConTope(v) * v.PENSION_SEGURO) / 100 : 0),
  /** Comisión de la AFP: sobre flujo o mixta, según el trabajador (la ONP no tiene). */
  PENSION_COMISION: (v) => (v.TIENE_PENSION && !v.ES_ONP ? (baseConTope(v) * v.PENSION_COMISION) / 100 : 0),
  /** Retención mensual del impuesto a la renta de quinta categoría. */
  RENTA_5TA: retencionQuinta,
};
