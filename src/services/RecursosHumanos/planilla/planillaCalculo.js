import { ValidationError } from '../../../utils/errors.js';
import { CARGOS_PESCADOR_IDS } from '../../../utils/planilla.constants.js';
import { evaluarFormula } from './evaluadorFormula.js';
import { RUTINAS_PLANILLA } from './rutinasPlanilla.js';
import parametroLegalService from '../parametroLegal.service.js';
import tarifaEntidadPensionService from '../tarifaEntidadPension.service.js';

/**
 * Cálculo de una planilla: toma los contratos activos de la empresa para el periodo, aplica los conceptos
 * vigentes, los parámetros legales y las tarifas de pensión, y devuelve las boletas SIN guardar nada.
 * Quien lo llama (planilla.service.js) lo guarda dentro de su transacción.
 */

const MS_DIA = 24 * 60 * 60 * 1000;
// Mes comercial: si el parámetro DIAS_BASE_MES no está cargado se usa 30
const DIAS_BASE_MES_POR_DEFECTO = 30;

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
          id: true, nombres: true, apellidos: true, cargoId: true, esObrero: true, cesado: true, fechaCese: true,
          entidadPensionId: true, comisionMixta: true, tieneAsignacionFamiliar: true, aplicaSctr: true,
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

  const boletas = [];
  for (const contrato of contratos) {
    const personal = contrato.personal;
    const dias = calcularDias(planilla, contrato, personal);
    if (dias <= 0) continue;

    const remuneracionTotal = contrato.esJornal
      ? Number(contrato.remuneracionBasica) * dias
      : (Number(contrato.remuneracionBasica) / diasBaseMes) * dias;
    const basico = redondear(remuneracionDelDestino(contrato, remuneracionTotal));

    const esPescador = CARGOS_PESCADOR_IDS.includes(Number(personal.cargoId));
    const variables = {
      ...variablesLegales,
      BASICO: basico,
      DIAS: dias,
      REMUNERACION_CONTRATO: Number(contrato.remuneracionBasica),
      ES_LOCACION: contrato.esLocacionServicios ? 1 : 0,
      ES_OBRERO: personal.esObrero ? 1 : 0,
      ES_PESCADOR: esPescador ? 1 : 0,
      TIENE_ASIGNACION_FAMILIAR: personal.tieneAsignacionFamiliar ? 1 : 0,
      APLICA_SCTR: personal.aplicaSctr ? 1 : 0,
      TIENE_PENSION: 0, ES_ONP: 0, PENSION_APORTE: 0, PENSION_SEGURO: 0, PENSION_COMISION: 0, REM_MAX_ASEGURABLE: 0,
      BASE_AFP: 0, BASE_ESSALUD: 0, BASE_QUINTA: 0, BASE_QUINTA_ORDINARIA: 0, BASE_SCTR: 0,
      BASE_GRATIFICACION: 0, BASE_CTS: 0, BASE_VACACIONES: 0,
      TOTAL_INGRESOS: 0, TOTAL_DESCUENTOS: 0,
      DIAS_BASE_MES: diasBaseMes,
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
      variables.PENSION_COMISION = Number(personal.comisionMixta ? tarifa.porcentajeComisionMixta : tarifa.porcentajeComisionFlujo);
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
      diasTrabajados: dias,
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
