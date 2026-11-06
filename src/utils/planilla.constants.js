/**
 * Constantes del módulo de Planillas (RRHH).
 */

/**
 * Estados de la planilla (EstadoMultiFuncion, tipo "RECURSOS HUMANOS").
 * Flujo: PENDIENTE (se puede regenerar) → APROBADO_JEFE_PERSONAL → APROBADO_GERENCIA.
 * Al aprobar la gerencia se crean las deudas con el personal y el asiento contable.
 */
export const ESTADO_PLANILLA = {
  PENDIENTE: 147,
  APROBADO_JEFE_PERSONAL: 148,
  APROBADO_GERENCIA: 149,
};

/** Estado PENDIENTE de las deudas con el personal (EstadoMultiFuncion, tipo "DEUDAS CON EL PERSONAL"). */
export const ESTADO_DEUDA_PERSONAL_PENDIENTE = 114;

/** Módulo RECURSOS HUMANOS (ModuloSistema): origen de las deudas creadas por la planilla. */
export const MODULO_RECURSOS_HUMANOS_ID = 17;

/** Nombre del modelo que identifica al submódulo origen de los asientos de planilla (SubmoduloSistema.nombreModeloOrigen). */
export const MODELO_ORIGEN_PLANILLA = 'Planilla';

/**
 * Cargos (CargosPersonal) que son siempre pescadores: patrón, motorista, panguero y tripulante.
 * Define la categoría pescador de la planilla; el Bahía y el resto de cargos son empleados u obreros (Personal.esObrero).
 */
export const CARGOS_PESCADOR_IDS = [22, 14, 27, 21];
