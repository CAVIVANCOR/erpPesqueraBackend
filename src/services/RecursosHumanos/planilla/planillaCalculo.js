import { ValidationError } from '../../../utils/errors.js';
import { CARGOS_PESCADOR_IDS } from '../../../utils/planilla.constants.js';
import { evaluarFormula } from './evaluadorFormula.js';
import { RUTINAS_PLANILLA } from './rutinasPlanilla.js';
import parametroLegalService from '../parametroLegal.service.js';
import tarifaEntidadPensionService from '../tarifaEntidadPension.service.js';
import vacacionesService from '../vacaciones.service.js';

/**
 * Cálculo de una planilla: toma los contratos activos de la empresa para el periodo, aplica los conceptos
 * vigentes, los parámetros legales y las tarifas de pensión, y devuelve las boletas SIN guardar nada.
 * Quien lo llama (planilla.service.js) lo guarda dentro de su transacción.
 */

const MS_DIA = 24 * 60 * 60 * 1000;
// Mes comercial: si el parámetro DIAS_BASE_MES no está cargado se usa 30
const DIAS_BASE_MES_POR_DEFECTO = 30;
// Jornada ordinaria si los parámetros HORAS_JORNADA_MES, HORAS_DIA_HABIL y HORAS_SABADO no están cargados
const HORAS_JORNADA_MES_POR_DEFECTO = 180;
const HORAS_DIA_HABIL_POR_DEFECTO = 8;
const HORAS_SABADO_POR_DEFECTO = 4;

const redondear = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;
const indiceDia = (fecha) => Math.floor(new Date(fecha).getTime() / MS_DIA);
const nombrePersonal = (personal) => `${personal.apellidos} ${personal.nombres}`.trim();

/** Días trabajados dentro del periodo: contrato vigente y trabajador no cesado. Cobertura total = periodicidad completa. */
function calcularDias(planilla, contrato, personal) {
  const inicioPeriodo = indiceDia(planilla.fechaInicio);
  const finPeriodo = indiceDia(planilla.fechaFin);
  const inicio = Math.max(inicioPeriodo, indiceDia(contrato.fechaInicio));
  const limites = [finPeriodo];
  if (contrato.fechaFin) limites.push(indiceDia(contrato.fechaFin));
  if (personal.cesado && personal.fechaCese) limites.push(indiceDia(personal.fechaCese));
  const fin = Math.min(...limites);
  const efectivos = Math.max(0, fin - inicio + 1);
  const periodoCompleto = efectivos === finPeriodo - inicioPeriodo + 1;
  const periodicidad = planilla.periodicidadDias;
  if (!periodicidad) return efectivos;
  return periodoCompleto ? periodicidad : Math.min(efectivos, periodicidad);
}

/** Planilla de un mes calendario completo (del día 1 al último día del mes) con periodicidad mensual */
function esMesCalendarioCompleto(planilla) {
  if (planilla.periodicidadDias !== 30) return false;
  const inicio = new Date(planilla.fechaInicio);
  const fin = new Date(planilla.fechaFin);
  const ultimoDia = new Date(Date.UTC(inicio.getUTCFullYear(), inicio.getUTCMonth() + 1, 0));
  return inicio.getUTCDate() === 1 && indiceDia(fin) === indiceDia(ultimoDia);
}

const diasCalendarioDelPeriodo = (planilla) => indiceDia(planilla.fechaFin) - indiceDia(planilla.fechaInicio) + 1;

/** Rango de días (índices) en que el contrato está vigente dentro del periodo, o null si no cubre ninguno */
function rangoEfectivo(planilla, contrato, personal) {
  const inicio = Math.max(indiceDia(planilla.fechaInicio), indiceDia(contrato.fechaInicio));
  const limites = [indiceDia(planilla.fechaFin)];
  if (contrato.fechaFin) limites.push(indiceDia(contrato.fechaFin));
  if (personal.cesado && personal.fechaCese) limites.push(indiceDia(personal.fechaCese));
  const fin = Math.min(...limites);
  return fin >= inicio ? { inicio, fin } : null;
}

/**
 * Horas de jornada ordinaria del periodo: las del mes menos las que se dejan de trabajar. Cada día no laborado descuenta las horas de ese
 * día de la semana: lunes a viernes las de un día hábil, sábado las del sábado y domingo cero. Los días del periodo fuera del contrato
 * (ingreso o cese a mitad de mes) también se descuentan.
 */
function calcularHorasJornada(planilla, rango, suspensiones, horasMes, horasHabil, horasSabado) {
  const noTrabajados = new Set();
  const inicioPeriodo = indiceDia(planilla.fechaInicio);
  const finPeriodo = indiceDia(planilla.fechaFin);
  for (let d = inicioPeriodo; d <= finPeriodo; d++) {
    if (!rango || d < rango.inicio || d > rango.fin) noTrabajados.add(d);
  }
  for (const susp of suspensiones) {
    for (let d = indiceDia(susp.fechaInicio); d <= indiceDia(susp.fechaFin); d++) noTrabajados.add(d);
  }
  let descuento = 0;
  for (const d of noTrabajados) {
    const diaSemana = new Date(d * MS_DIA).getUTCDay(); // 0 domingo ... 6 sábado
    if (diaSemana === 0) continue;
    descuento += diaSemana === 6 ? horasSabado : horasHabil;
  }
  return Math.max(0, horasMes - descuento);
}

/**
 * Semestre de gratificación que se paga en el periodo (Ley 27735: hasta el 15 de julio y el 15 de diciembre).
 * Es la planilla cuyo periodo contiene el 15 de julio (semestre enero-junio) o el 15 de diciembre (julio-diciembre).
 * Las fechas son de la ley, no un parámetro: no cambian con el régimen.
 */
function semestreGratificacion(planilla, anio) {
  const inicio = indiceDia(planilla.fechaInicio);
  const fin = indiceDia(planilla.fechaFin);
  const contiene = (mes, dia) => {
    const d = indiceDia(Date.UTC(anio, mes, dia));
    return inicio <= d && d <= fin;
  };
  if (contiene(6, 15)) return { desdeAnio: anio, mesInicial: 0 };
  if (contiene(11, 15)) return { desdeAnio: anio, mesInicial: 6 };
  return null;
}

/**
 * Meses calendario COMPLETOS laborados en el semestre (la gratificación paga 1/6 por cada uno). El inicio es el más antiguo entre el
 * ingreso del trabajador y el contrato (un cambio de sueldo crea un contrato nuevo, pero no reinicia la antigüedad); el fin, el menor
 * entre el fin del contrato y el cese.
 */
function mesesCompletosGratificacion(semestre, personal, contrato) {
  const inicios = [contrato.fechaInicio, personal.fechaIngreso].filter(Boolean).map((f) => new Date(f).getTime());
  const inicioLaboral = indiceDia(Math.min(...inicios));
  const finales = [];
  if (contrato.fechaFin) finales.push(indiceDia(contrato.fechaFin));
  if (personal.cesado && personal.fechaCese) finales.push(indiceDia(personal.fechaCese));
  const finLaboral = finales.length ? Math.min(...finales) : Infinity;
  let meses = 0;
  for (let mes = semestre.mesInicial; mes < semestre.mesInicial + 6; mes++) {
    const primero = indiceDia(Date.UTC(semestre.desdeAnio, mes, 1));
    const ultimo = indiceDia(Date.UTC(semestre.desdeAnio, mes + 1, 0));
    if (inicioLaboral <= primero && finLaboral >= ultimo) meses++;
  }
  return meses;
}

/** Parte de la remuneración del periodo que corresponde a esta planilla según las líneas de pago del contrato. */
function remuneracionDelDestino(contrato, remuneracionTotal) {
  const lineas = contrato.lineasPago || [];
  if (lineas.length === 0) return remuneracionTotal;
  let acumulado = 0;
  let destino = 0;
  for (const linea of lineas) {
    let importe;
    if (linea.esCalculada) {
      throw new ValidationError(
        'El contrato tiene una línea de pago "calculada por la planilla", que aún no está soportada. Use monto fijo, porcentaje o saldo.',
      );
    }
    if (linea.esSaldo) importe = remuneracionTotal - acumulado;
    else if (linea.porcentaje !== null && linea.porcentaje !== undefined) importe = (remuneracionTotal * Number(linea.porcentaje)) / 100;
    else importe = Number(linea.monto);
    acumulado += importe;
    // La línea cuenta para esta planilla si su destino coincide con el tipo del contrato (planilla u honorarios)
    if (Boolean(linea.esPlanilla) === !contrato.esLocacionServicios) destino += importe;
  }
  return destino;
}

const naturalezaDe = (concepto) =>
  concepto.esDescuento ? 'DESCUENTO' : concepto.esAporteEmpleador ? 'APORTE' : concepto.esProvision ? 'PROVISION' : 'INGRESO';

/**
 * @param {Object} tx - Cliente de Prisma (transacción)
 * @param {Object} planilla - { empresaId, fechaInicio, fechaFin, periodicidadDias }
 * @returns {Promise<Array>} Boletas: una por contrato con sus conceptos y totales
 */
export async function calcularPlanilla(tx, planilla) {
  const empresa = await tx.empresa.findUnique({ where: { id: planilla.empresaId }, select: { regimenLaboralId: true } });
  const fechaInicio = new Date(planilla.fechaInicio);
  const fechaFin = new Date(planilla.fechaFin);

  const contratos = await tx.contratoPersonal.findMany({
    where: {
      empresaId: planilla.empresaId,
      activo: true,
      fechaInicio: { lte: fechaFin },
      OR: [{ fechaFin: null }, { fechaFin: { gte: fechaInicio } }],
      ...(planilla.periodicidadDias
        ? { periodicidadDias: planilla.periodicidadDias, pagaPorTemporada: false }
        : { pagaPorTemporada: true }),
    },
    include: {
      lineasPago: { orderBy: { orden: 'asc' } },
      personal: {
        select: {
          id: true, nombres: true, apellidos: true, cargoId: true, esObrero: true, cesado: true, fechaCese: true, fechaIngreso: true,
          entidadPensionId: true, tipoComisionPensionId: true, tieneAsignacionFamiliar: true, aplicaSctr: true,
        },
      },
    },
    orderBy: [{ personalId: 'asc' }, { fechaInicio: 'asc' }],
  });
  if (contratos.length === 0) {
    throw new ValidationError(
      'No hay contratos activos para este periodo. Verifique en Contratos de Personal que la empresa tenga contratos vigentes con la misma periodicidad de pago (o "Se paga por temporada").',
    );
  }

  const [parametros, tarifas, conceptos] = await Promise.all([
    parametroLegalService.obtenerVigentes(fechaFin, empresa?.regimenLaboralId),
    tarifaEntidadPensionService.obtenerVigentes(fechaFin),
    // Conceptos vigentes al cierre del periodo, en el orden en que deben calcularse
    tx.conceptoPlanilla.findMany({
      where: {
        activo: true,
        vigenteDesde: { lte: fechaFin },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: fechaFin } }],
      },
      orderBy: [{ orden: 'asc' }, { codigo: 'asc' }],
    }),
  ]);
  if (conceptos.length === 0) {
    throw new ValidationError('No hay conceptos de planilla vigentes. Cree los conceptos (sueldo, descuentos, aportes) en Conceptos de Planilla.');
  }

  const variablesLegales = Object.fromEntries(parametros.map((p) => [p.clave, Number(p.valor)]));
  const diasBaseMes = variablesLegales.DIAS_BASE_MES || DIAS_BASE_MES_POR_DEFECTO;
  const tarifaPorEntidad = new Map(tarifas.map((t) => [Number(t.entidadPensionId), t]));
  const entidades = await tx.entidadPension.findMany({ select: { id: true, descripcion: true, esOnp: true } });
  const entidadPorId = new Map(entidades.map((e) => [Number(e.id), e]));
  // Tipos de comisión (catálogo abierto) y su porcentaje por tarifa: reemplazan al antiguo interruptor comisionMixta (eliminado)
  // Solo se leen id, código e indicador: el nombre no interviene en el cálculo y así un nombre mal codificado no tumba la planilla
  const tiposComision = new Map(
    (await tx.tipoComisionPension.findMany({ select: { id: true, codigo: true, sinComision: true } })).map((t) => [Number(t.id), t]),
  );
  const comisionPorTarifaYTipo = new Map(
    (await tx.tarifaEntidadPensionComision.findMany({ where: { tarifaEntidadPensionId: { in: tarifas.map((t) => t.id) } } })).map((c) => [
      `${c.tarifaEntidadPensionId}-${c.tipoComisionPensionId}`,
      Number(c.porcentaje),
    ]),
  );
  // Porcentaje de comisión de una persona: sale de su tipo de comisión. La ONP no cobra comisión, por eso no exige tipo.
  const porcentajeComision = (personal, tarifa, entidad) => {
    if (entidad?.esOnp) return 0;
    const tipo = personal.tipoComisionPensionId ? tiposComision.get(Number(personal.tipoComisionPensionId)) : null;
    if (!tipo) {
      throw new ValidationError(
        `${nombrePersonal(personal)} está en ${entidad?.descripcion || 'una AFP'} pero no tiene el tipo de comisión asignado. Elíjalo en la ficha de Personal (Datos laborales y de planilla).`,
      );
    }
    if (tipo.sinComision) return 0;
    const guardado = comisionPorTarifaYTipo.get(`${tarifa.id}-${tipo.id}`);
    if (guardado !== undefined) return guardado;
    // Tarifas registradas antes del catálogo: los dos tipos históricos se leen de sus columnas originales
    if (tipo.codigo === 'FLUJO') return Number(tarifa.porcentajeComisionFlujo);
    if (tipo.codigo === 'MIXTA') return Number(tarifa.porcentajeComisionMixta);
    throw new ValidationError(
      `${nombrePersonal(personal)} tiene el tipo de comisión "${tipo.codigo}", pero la tarifa vigente de ${entidad?.descripcion || 'su entidad de pensión'} no define el porcentaje para ese tipo. Regístrelo en las tarifas de la entidad de pensión.`,
    );
  };

  // Renta de 5ta: necesita lo ganado y retenido en los meses anteriores del mismo año (solo planillas, no locaciones)
  const anio = fechaFin.getUTCFullYear();
  const mes = fechaFin.getUTCMonth() + 1;
  const historialQuinta = new Map();
  if (conceptos.some((c) => c.claveMotor === 'RENTA_5TA')) {
    const filas = await tx.planillaTrabajadorConcepto.findMany({
      where: {
        planillaTrabajador: {
          personalId: { in: [...new Set(contratos.map((c) => c.personalId))] },
          contratoPersonal: { esLocacionServicios: false },
          ...(planilla.id && { planillaId: { not: planilla.id } }),
          planilla: {
            empresaId: planilla.empresaId,
            fechaFin: { gte: new Date(Date.UTC(anio, 0, 1)), lt: new Date(Date.UTC(anio, mes - 1, 1)) },
          },
        },
      },
      select: {
        monto: true,
        naturaleza: true,
        planillaTrabajador: { select: { personalId: true } },
        conceptoPlanilla: { select: { afectaQuintaCategoria: true, claveMotor: true } },
      },
    });
    for (const fila of filas) {
      const personalId = Number(fila.planillaTrabajador.personalId);
      const acumulado = historialQuinta.get(personalId) || { ingresos: 0, retenciones: 0 };
      if (fila.naturaleza === 'INGRESO' && fila.conceptoPlanilla.afectaQuintaCategoria) acumulado.ingresos += Number(fila.monto);
      if (fila.naturaleza === 'DESCUENTO' && fila.conceptoPlanilla.claveMotor === 'RENTA_5TA') acumulado.retenciones += Number(fila.monto);
      historialQuinta.set(personalId, acumulado);
    }
  }

  // Suspensiones de labores (vacaciones, faltas, descansos...) que caen dentro del periodo, por trabajador
  const suspensionesPorPersonal = await vacacionesService.suspensionesEnPeriodo(
    tx,
    [...new Set(contratos.map((c) => Number(c.personalId)))],
    fechaInicio,
    fechaFin,
  );
  const horasMes = variablesLegales.HORAS_JORNADA_MES || HORAS_JORNADA_MES_POR_DEFECTO;
  const horasHabil = variablesLegales.HORAS_DIA_HABIL || HORAS_DIA_HABIL_POR_DEFECTO;
  const horasSabado = variablesLegales.HORAS_SABADO ?? HORAS_SABADO_POR_DEFECTO;

  const boletas = [];
  for (const contrato of contratos) {
    const personal = contrato.personal;
    // Mes calendario completo: se prorratea sobre los días del mes (28 a 31). En los demás periodos se usa el mes comercial (DIAS_BASE_MES)
    const mesCalendario = !contrato.esLocacionServicios && esMesCalendarioCompleto(planilla);
    const baseDias = mesCalendario ? diasCalendarioDelPeriodo(planilla) : diasBaseMes;
    const rango = rangoEfectivo(planilla, contrato, personal);
    const diasCubiertos = mesCalendario ? (rango ? rango.fin - rango.inicio + 1 : 0) : calcularDias(planilla, contrato, personal);
    if (diasCubiertos <= 0) continue;

    // Suspensiones del trabajador en el periodo: vacaciones se pagan aparte (remuneración vacacional), los subsidios los paga EsSalud y
    // las faltas o licencias sin goce no se pagan. Las licencias con goce se pagan dentro del básico.
    const suspensiones = contrato.esLocacionServicios ? [] : suspensionesPorPersonal.get(Number(personal.id)) || [];
    const sumaDias = (filtro) => suspensiones.filter(filtro).reduce((total, s) => total + s.dias, 0);
    const diasVacaciones = sumaDias((s) => s.tipo.esDescansoVacacional);
    const diasSubsidiados = sumaDias((s) => s.tipo.esSubsidio);
    const diasSinGoce = sumaDias((s) => !s.tipo.esDescansoVacacional && !s.tipo.esSubsidio && !s.tipo.conGoceRemuneracion);
    const diasNoLaborados = sumaDias((s) => !s.tipo.esSubsidio);
    const diasSinMovilidad = sumaDias((s) => !s.tipo.pagaMovilidad);
    const dias = Math.max(0, diasCubiertos - diasSubsidiados - diasSinGoce); // días con remuneración (laborados, vacaciones y licencias con goce)
    if (dias <= 0) continue;
    const diasBasico = Math.max(0, dias - diasVacaciones);

    const tarifaDia = contrato.esJornal ? Number(contrato.remuneracionBasica) : Number(contrato.remuneracionBasica) / baseDias;
    const totalBasico = tarifaDia * diasBasico;
    const totalVacacional = tarifaDia * diasVacaciones;
    const totalRemuneracion = remuneracionDelDestino(contrato, totalBasico + totalVacacional);
    const proporcionBasico = totalBasico + totalVacacional > 0 ? totalBasico / (totalBasico + totalVacacional) : 1;
    const basico = redondear(totalRemuneracion * proporcionBasico);
    const remuneracionVacacional = diasVacaciones > 0 ? redondear(redondear(totalRemuneracion) - basico) : 0;
    // La movilidad se paga completa durante las vacaciones y se descuenta solo por los días de los tipos que no la pagan (faltas...)
    const movilidadDevengada = redondear((Number(contrato.movilidadFija || 0) / baseDias) * Math.max(0, diasCubiertos - diasSinMovilidad));
    const horasJornada = mesCalendario ? calcularHorasJornada(planilla, rango, suspensiones, horasMes, horasHabil, horasSabado) : null;

    const esPescador = CARGOS_PESCADOR_IDS.includes(Number(personal.cargoId));
    // Gratificación: solo la planilla que contiene el 15 de julio o el 15 de diciembre la paga; las locaciones no la tienen
    const semestre = contrato.esLocacionServicios ? null : semestreGratificacion(planilla, anio);
    const variables = {
      // Monto de cada concepto ya calculado en esta boleta (MONTO_<CODIGO>); en 0 hasta que se calcula o si no aplica.
      // Permite fórmulas encadenadas, p. ej. la bonificación extraordinaria = MONTO_GRATIFICACION * 9 / 100.
      ...Object.fromEntries(conceptos.map((c) => [`MONTO_${String(c.codigo).toUpperCase()}`, 0])),
      ...variablesLegales,
      BASICO: basico,
      REMUNERACION_VACACIONAL: remuneracionVacacional,
      DIAS: dias,
      DIAS_LABORADOS: diasBasico,
      DIAS_VACACIONES: diasVacaciones,
      DIAS_SUBSIDIADOS: diasSubsidiados,
      DIAS_SIN_GOCE: diasSinGoce,
      DIAS_NO_LABORADOS: diasNoLaborados,
      DIAS_MES: diasCalendarioDelPeriodo(planilla),
      REMUNERACION_CONTRATO: Number(contrato.remuneracionBasica),
      // Movilidad fija mensual del contrato (no remunerativa): completa y proporcional a los días del periodo; el concepto elige cuál usar
      MOVILIDAD_FIJA: Number(contrato.movilidadFija || 0),
      MOVILIDAD_PROPORCIONAL: movilidadDevengada,
      MOVILIDAD_DEVENGADA: movilidadDevengada,
      ES_LOCACION: contrato.esLocacionServicios ? 1 : 0,
      ES_OBRERO: personal.esObrero ? 1 : 0,
      ES_PESCADOR: esPescador ? 1 : 0,
      TIENE_ASIGNACION_FAMILIAR: personal.tieneAsignacionFamiliar ? 1 : 0,
      APLICA_SCTR: personal.aplicaSctr ? 1 : 0,
      TIENE_PENSION: 0, ES_ONP: 0, PENSION_APORTE: 0, PENSION_SEGURO: 0, PENSION_COMISION: 0, REM_MAX_ASEGURABLE: 0,
      BASE_AFP: 0, BASE_ESSALUD: 0, BASE_QUINTA: 0, BASE_QUINTA_ORDINARIA: 0, BASE_SCTR: 0,
      BASE_GRATIFICACION: 0, BASE_CTS: 0, BASE_VACACIONES: 0,
      // Equivalente MENSUAL de cada base (base del periodo / días × días del mes): la gratificación, la CTS y las vacaciones se calculan
      // sobre la remuneración mensual aunque la planilla sea semanal o la persona haya ingresado a mitad de mes
      BASE_GRATIFICACION_MENSUAL: 0, BASE_CTS_MENSUAL: 0, BASE_VACACIONES_MENSUAL: 0,
      PAGA_GRATIFICACION: semestre ? 1 : 0,
      MESES_GRATIFICACION: semestre ? mesesCompletosGratificacion(semestre, personal, contrato) : 0,
      TOTAL_INGRESOS: 0, TOTAL_DESCUENTOS: 0,
      DIAS_BASE_MES: baseDias,
      PERIODICIDAD_DIAS: planilla.periodicidadDias || 0,
      MES: mes,
      ANIO: anio,
      INGRESOS_ANTERIORES_5TA: historialQuinta.get(Number(personal.id))?.ingresos || 0,
      RETENCIONES_ANTERIORES_5TA: historialQuinta.get(Number(personal.id))?.retenciones || 0,
    };

    // Las locaciones de servicio no tienen sistema de pensiones
    if (personal.entidadPensionId && !contrato.esLocacionServicios) {
      const entidad = entidadPorId.get(Number(personal.entidadPensionId));
      const tarifa = tarifaPorEntidad.get(Number(personal.entidadPensionId));
      if (!tarifa) {
        throw new ValidationError(
          `${entidad?.descripcion || 'La entidad de pensión'} de ${nombrePersonal(personal)} no tiene una tarifa vigente al ${fechaFin.toISOString().slice(0, 10)}. Regístrela en Entidades de Pensión.`,
        );
      }
      variables.TIENE_PENSION = 1;
      variables.ES_ONP = entidad?.esOnp ? 1 : 0;
      variables.PENSION_APORTE = Number(tarifa.porcentajeAporte);
      variables.PENSION_SEGURO = Number(tarifa.porcentajeSeguro);
      variables.PENSION_COMISION = porcentajeComision(personal, tarifa, entidad);
      variables.REM_MAX_ASEGURABLE = Number(tarifa.remuneracionMaximaAsegurable || 0);
    }

    const filas = [];
    for (const concepto of conceptos) {
      const contexto = `Concepto ${concepto.codigo} (${nombrePersonal(personal)})`;
      try {
        if (concepto.condicionAplica && !evaluarFormula(concepto.condicionAplica, variables)) continue;

        let monto;
        if (concepto.claveMotor) {
          const rutina = RUTINAS_PLANILLA[concepto.claveMotor];
          if (!rutina) throw new Error(`usa la rutina "${concepto.claveMotor}", que el sistema aún no tiene`);
          monto = rutina(variables);
        } else if (concepto.formula) {
          monto = evaluarFormula(concepto.formula, variables);
        } else {
          monto = 0; // Manual: la jefa de personal escribe el valor con una corrección
        }
        monto = redondear(monto);
        variables[`MONTO_${String(concepto.codigo).toUpperCase()}`] = monto;
        if (monto === 0 && !concepto.esManual) continue;

        const naturaleza = naturalezaDe(concepto);
        if (naturaleza === 'INGRESO') {
          variables.TOTAL_INGRESOS += monto;
          if (concepto.afectaAfpOnp) variables.BASE_AFP += monto;
          if (concepto.afectaEssalud) variables.BASE_ESSALUD += monto;
          if (concepto.afectaQuintaCategoria) {
            variables.BASE_QUINTA += monto;
            // Los conceptos recurrentes del contrato son la remuneración ordinaria que se proyecta al resto del año
            if (concepto.esRecurrente) variables.BASE_QUINTA_ORDINARIA += monto;
          }
          if (concepto.afectaSctr) variables.BASE_SCTR += monto;
          if (concepto.cuentaParaGratificacion) variables.BASE_GRATIFICACION += monto;
          if (concepto.cuentaParaCts) variables.BASE_CTS += monto;
          if (concepto.cuentaParaVacaciones) variables.BASE_VACACIONES += monto;
          const aMensual = (base) => (variables.DIAS > 0 ? (base / variables.DIAS) * baseDias : 0);
          variables.BASE_GRATIFICACION_MENSUAL = aMensual(variables.BASE_GRATIFICACION);
          variables.BASE_CTS_MENSUAL = aMensual(variables.BASE_CTS);
          variables.BASE_VACACIONES_MENSUAL = aMensual(variables.BASE_VACACIONES);
        } else if (naturaleza === 'DESCUENTO') {
          variables.TOTAL_DESCUENTOS += monto;
        }
        filas.push({
          conceptoPlanillaId: concepto.id,
          descripcion: concepto.descripcion,
          naturaleza,
          monto,
        });
      } catch (err) {
        if (err instanceof ValidationError) throw err;
        throw new ValidationError(`${contexto}: ${err.message}.`);
      }
    }

    const suma = (naturaleza) => redondear(filas.filter((f) => f.naturaleza === naturaleza).reduce((total, f) => total + f.monto, 0));
    const totalIngresos = suma('INGRESO');
    const totalDescuentos = suma('DESCUENTO');
    boletas.push({
      personalId: personal.id,
      contratoPersonalId: contrato.id,
      esObrero: Boolean(personal.esObrero) && !esPescador,
      esPescador,
      diasTrabajados: Math.max(0, diasCubiertos - diasNoLaborados - diasSubsidiados),
      diasMes: mesCalendario ? baseDias : null,
      diasNoLaborados,
      diasSubsidiados,
      horasJornada,
      suspensiones: suspensiones.map((s) => ({
        suspensionLaboralId: s.suspensionLaboralId,
        tipoSuspensionLaboralId: s.tipoSuspensionLaboralId,
        fechaInicio: s.fechaInicio,
        fechaFin: s.fechaFin,
        dias: s.dias,
      })),
      remuneracionBasica: basico,
      totalIngresos,
      totalDescuentos,
      totalAportesEmpleador: suma('APORTE'),
      totalNeto: redondear(totalIngresos - totalDescuentos),
      conceptos: filas,
    });
  }

  if (boletas.length === 0) {
    throw new ValidationError('Ningún contrato tiene días trabajados dentro del periodo indicado.');
  }
  return boletas;
}
