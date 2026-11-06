import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import { normalizarTexto } from '../../utils/texto.util.js';
import { TIPO_LIBRO } from '../../utils/tiposLibroContable.js';
import { ESTADO_PERIODO_CONTABLE, ESTADO_ASIENTO_CONTABLE } from '../../utils/estados.constants.js';
import {
  ESTADO_PLANILLA,
  ESTADO_DEUDA_PERSONAL_PENDIENTE,
  MODULO_RECURSOS_HUMANOS_ID,
  MODELO_ORIGEN_PLANILLA,
} from '../../utils/planilla.constants.js';
import periodoContableService from '../Contabilidad/periodoContable.service.js';
import { calcularPlanilla } from './planilla/planillaCalculo.js';

/**
 * Servicio de Planillas.
 *
 * Flujo (decisión del propietario, sin simulación):
 *  1. GENERAR: crea la planilla en PENDIENTE y calcula las boletas. Si está mal, REGENERAR borra y recalcula.
 *  2. La jefa de personal aprueba (APROBADO_JEFE_PERSONAL) y luego el gerente general (APROBADO_GERENCIA).
 *  3. Solo con la aprobación de gerencia se crean las deudas con el personal y el asiento contable, en una sola transacción.
 */

const PERIODICIDADES_VALIDAS = [7, 15, 30];

const manejarError = (err, contexto) => {
  if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
  if (err.code && String(err.code).startsWith('P')) {
    throw new DatabaseError(`Error de base de datos al ${contexto}`, err.message);
  }
  throw err;
};

const redondear = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;
const aFecha = (valor, etiqueta) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) throw new ValidationError(`${etiqueta} no es una fecha válida.`);
  return fecha;
};

const incluirListado = {
  empresa: { select: { id: true, razonSocial: true } },
  estado: { select: { id: true, descripcion: true, severityColor: true } },
  _count: { select: { trabajadores: true } },
};

const incluirDetalle = {
  empresa: { select: { id: true, razonSocial: true, ruc: true } },
  estado: { select: { id: true, descripcion: true, severityColor: true } },
  aprobadorJefePersonal: { select: { id: true, nombres: true, apellidos: true } },
  aprobadorGerente: { select: { id: true, nombres: true, apellidos: true } },
  trabajadores: {
    include: {
      personal: {
        select: {
          id: true, nombres: true, apellidos: true, numeroDocumento: true, fechaIngreso: true, cuspp: true,
          cargo: { select: { descripcion: true } },
          entidadPension: { select: { descripcion: true } },
        },
      },
      contratoPersonal: { select: { id: true, esLocacionServicios: true } },
      conceptos: {
        include: { conceptoPlanilla: { select: { visibleEnBoleta: true } } },
        orderBy: [{ conceptoPlanilla: { orden: 'asc' } }, { id: 'asc' }],
      },
    },
    orderBy: [{ personal: { apellidos: 'asc' } }, { id: 'asc' }],
  },
};

const obtenerOFallar = async (id, include = undefined) => {
  const planilla = await prisma.planilla.findUnique({ where: { id }, ...(include && { include }) });
  if (!planilla) throw new NotFoundError('Planilla no encontrada');
  return planilla;
};

/** Guarda las boletas calculadas y actualiza los totales de la planilla. Se usa dentro de una transacción. */
async function guardarBoletas(tx, planillaId, boletas, usuarioId) {
  for (const { conceptos, ...boleta } of boletas) {
    await tx.planillaTrabajador.create({
      data: { ...boleta, planillaId, creadoPor: usuarioId, conceptos: { create: conceptos } },
    });
  }
  await actualizarTotales(tx, planillaId);
}

/** Recalcula los totales de cada boleta y de la planilla a partir de sus conceptos. */
async function actualizarTotales(tx, planillaId) {
  const trabajadores = await tx.planillaTrabajador.findMany({ where: { planillaId }, include: { conceptos: true } });
  const total = { ingresos: 0, descuentos: 0, aportes: 0 };
  for (const trabajador of trabajadores) {
    const suma = (naturaleza) =>
      redondear(trabajador.conceptos.filter((c) => c.naturaleza === naturaleza).reduce((acum, c) => acum + Number(c.monto), 0));
    const ingresos = suma('INGRESO');
    const descuentos = suma('DESCUENTO');
    const aportes = suma('APORTE');
    await tx.planillaTrabajador.update({
      where: { id: trabajador.id },
      data: { totalIngresos: ingresos, totalDescuentos: descuentos, totalAportesEmpleador: aportes, totalNeto: redondear(ingresos - descuentos) },
    });
    total.ingresos += ingresos;
    total.descuentos += descuentos;
    total.aportes += aportes;
  }
  await tx.planilla.update({
    where: { id: planillaId },
    data: {
      totalIngresos: redondear(total.ingresos),
      totalDescuentos: redondear(total.descuentos),
      totalAportesEmpleador: redondear(total.aportes),
      totalNeto: redondear(total.ingresos - total.descuentos),
    },
  });
}

const listar = async (filtros = {}) => {
  try {
    const where = {};
    if (filtros.empresaId) where.empresaId = Number(filtros.empresaId);
    if (filtros.estadoId) where.estadoId = Number(filtros.estadoId);
    return await prisma.planilla.findMany({
      where,
      include: incluirListado,
      orderBy: [{ fechaInicio: 'desc' }, { id: 'desc' }],
    });
  } catch (err) {
    manejarError(err, 'listar las planillas');
  }
};

const obtenerPorId = async (id) => {
  try {
    return await obtenerOFallar(id, incluirDetalle);
  } catch (err) {
    manejarError(err, 'obtener la planilla');
  }
};

/** Crea la planilla en PENDIENTE y calcula las boletas. Si no hay nada que calcular, no se crea nada. */
const generar = async (data) => {
  try {
    const empresaId = Number(data.empresaId);
    if (!empresaId) throw new ValidationError('Seleccione la empresa de la planilla.');
    const descripcion = normalizarTexto(data.descripcion || '');
    if (!descripcion) throw new ValidationError('La descripción de la planilla es obligatoria (ej. "Semana 44 - noviembre 2026").');
    if (descripcion.length > 150) throw new ValidationError('La descripción no puede exceder 150 caracteres.');
    if (!data.fechaInicio) throw new ValidationError('La fecha de inicio del periodo es obligatoria.');
    if (!data.fechaFin) throw new ValidationError('La fecha de fin del periodo es obligatoria.');
    const fechaInicio = aFecha(data.fechaInicio, 'La fecha de inicio del periodo');
    const fechaFin = aFecha(data.fechaFin, 'La fecha de fin del periodo');
    if (fechaFin < fechaInicio) throw new ValidationError('La fecha de fin del periodo no puede ser anterior a la de inicio.');
    const periodicidadDias = data.periodicidadDias ? Number(data.periodicidadDias) : null;
    if (periodicidadDias !== null && !PERIODICIDADES_VALIDAS.includes(periodicidadDias)) {
      throw new ValidationError('La periodicidad debe ser 7, 15 o 30 días, o vacía para una planilla por temporada o faena.');
    }

    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { id: true, razonSocial: true, procesaPlanilla: true } });
    if (!empresa) throw new ValidationError('La empresa indicada no existe.');
    if (!empresa.procesaPlanilla) {
      throw new ValidationError(`La empresa ${empresa.razonSocial} no está marcada como "procesa planilla". Actívelo en Empresas, sección Recursos Humanos - Planilla.`);
    }

    const duplicada = await prisma.planilla.findFirst({
      where: { empresaId, periodicidadDias, fechaInicio, fechaFin },
    });
    if (duplicada) {
      throw new ConflictError(`Ya existe la planilla "${duplicada.descripcion}" con el mismo periodo y periodicidad. Regenérela en lugar de crear otra.`);
    }

    const usuarioId = data.creadoPor ? Number(data.creadoPor) : null;
    const id = await prisma.$transaction(
      async (tx) => {
        const boletas = await calcularPlanilla(tx, { empresaId, fechaInicio, fechaFin, periodicidadDias });
        const planilla = await tx.planilla.create({
          data: {
            empresaId, descripcion, periodicidadDias, fechaInicio, fechaFin,
            fechaPago: data.fechaPago ? aFecha(data.fechaPago, 'La fecha de pago') : null,
            estadoId: ESTADO_PLANILLA.PENDIENTE,
            generadaEn: new Date(),
            generadaPor: usuarioId,
            creadoPor: usuarioId,
          },
        });
        await guardarBoletas(tx, planilla.id, boletas, usuarioId);
        return planilla.id;
      },
      { timeout: 120000 },
    );
    return await obtenerOFallar(id, incluirDetalle);
  } catch (err) {
    manejarError(err, 'generar la planilla');
  }
};

/** Borra y recalcula las boletas. Permitido en PENDIENTE y en APROBADO_JEFE_PERSONAL (que vuelve a PENDIENTE). */
const regenerar = async (id, usuarioId = null) => {
  try {
    const planilla = await obtenerOFallar(id);
    if (Number(planilla.estadoId) === ESTADO_PLANILLA.APROBADO_GERENCIA) {
      throw new ConflictError('La planilla ya fue aprobada por gerencia y tiene deudas y asiento contable: no se puede regenerar.');
    }
    await prisma.$transaction(
      async (tx) => {
        const boletas = await calcularPlanilla(tx, planilla);
        await tx.planillaTrabajador.deleteMany({ where: { planillaId: id } });
        await guardarBoletas(tx, id, boletas, usuarioId);
        await tx.planilla.update({
          where: { id },
          data: {
            estadoId: ESTADO_PLANILLA.PENDIENTE,
            generadaEn: new Date(),
            generadaPor: usuarioId,
            // Una planilla regenerada vuelve a pasar por las aprobaciones
            aprobadaJefePersonalPor: null,
            aprobadaJefePersonalEn: null,
            actualizadoPor: usuarioId,
          },
        });
      },
      { timeout: 120000 },
    );
    return await obtenerOFallar(id, incluirDetalle);
  } catch (err) {
    manejarError(err, 'regenerar la planilla');
  }
};

/** Corrige a mano el monto de un concepto de una boleta; queda registrado quién, cuándo y por qué. */
const corregirConcepto = async (conceptoId, data) => {
  try {
    const monto = Number(data.monto);
    if (data.monto === undefined || data.monto === null || data.monto === '' || Number.isNaN(monto) || monto < 0) {
      throw new ValidationError('Ingrese el nuevo monto del concepto (cero o mayor).');
    }
    const motivo = String(data.motivoCorreccion || '').trim();
    if (!motivo) throw new ValidationError('El motivo de la corrección es obligatorio.');
    if (motivo.length > 300) throw new ValidationError('El motivo no puede exceder 300 caracteres.');

    const concepto = await prisma.planillaTrabajadorConcepto.findUnique({
      where: { id: conceptoId },
      include: { planillaTrabajador: { select: { planillaId: true, planilla: { select: { estadoId: true } } } } },
    });
    if (!concepto) throw new NotFoundError('Concepto de la boleta no encontrado');
    if (Number(concepto.planillaTrabajador.planilla.estadoId) !== ESTADO_PLANILLA.PENDIENTE) {
      throw new ConflictError('Solo se pueden corregir conceptos de una planilla PENDIENTE. Regenere la planilla para volver a ese estado.');
    }

    await prisma.$transaction(async (tx) => {
      await tx.planillaTrabajadorConcepto.update({
        where: { id: conceptoId },
        data: {
          monto: redondear(monto),
          // Conserva el monto original del sistema aunque se corrija más de una vez
          montoCalculado: concepto.corregidoManual ? concepto.montoCalculado : concepto.monto,
          corregidoManual: true,
          motivoCorreccion: motivo,
          corregidoPor: data.corregidoPor ? Number(data.corregidoPor) : null,
          corregidoEn: new Date(),
        },
      });
      await actualizarTotales(tx, concepto.planillaTrabajador.planillaId);
    });
    return await obtenerOFallar(concepto.planillaTrabajador.planillaId, incluirDetalle);
  } catch (err) {
    manejarError(err, 'corregir el concepto de la boleta');
  }
};

const aprobarJefePersonal = async (id, usuarioId) => {
  try {
    if (!usuarioId) throw new ValidationError('No se pudo identificar al usuario que aprueba: su usuario no está asociado a un personal.');
    const planilla = await obtenerOFallar(id);
    if (Number(planilla.estadoId) !== ESTADO_PLANILLA.PENDIENTE) {
      throw new ConflictError('Solo se puede aprobar como jefa de personal una planilla PENDIENTE.');
    }
    await prisma.planilla.update({
      where: { id },
      data: {
        estadoId: ESTADO_PLANILLA.APROBADO_JEFE_PERSONAL,
        aprobadaJefePersonalPor: usuarioId,
        aprobadaJefePersonalEn: new Date(),
        actualizadoPor: usuarioId,
      },
    });
    return await obtenerOFallar(id, incluirDetalle);
  } catch (err) {
    manejarError(err, 'aprobar la planilla como jefa de personal');
  }
};

/** Vuelve a PENDIENTE una planilla aprobada solo por la jefa de personal (sin deudas ni asiento). */
const reabrir = async (id, usuarioId = null) => {
  try {
    const planilla = await obtenerOFallar(id);
    if (Number(planilla.estadoId) === ESTADO_PLANILLA.APROBADO_GERENCIA) {
      throw new ConflictError('La planilla ya fue aprobada por gerencia y tiene deudas y asiento contable: primero deben anularse esos documentos.');
    }
    if (Number(planilla.estadoId) === ESTADO_PLANILLA.PENDIENTE) {
      throw new ConflictError('La planilla ya está PENDIENTE.');
    }
    await prisma.planilla.update({
      where: { id },
      data: { estadoId: ESTADO_PLANILLA.PENDIENTE, aprobadaJefePersonalPor: null, aprobadaJefePersonalEn: null, actualizadoPor: usuarioId },
    });
    return await obtenerOFallar(id, incluirDetalle);
  } catch (err) {
    manejarError(err, 'reabrir la planilla');
  }
};

/**
 * Aprobación del gerente general: en una sola transacción crea las deudas con el personal (una por trabajador y tipo de
 * deuda), el asiento contable de la planilla y pasa la planilla a APROBADO_GERENCIA. Si algo falla, no queda nada a medias.
 *
 * Asiento: por cada concepto, Debe = cuenta del Debe y Haber = cuenta del Haber del concepto para la categoría del
 * trabajador (empleado, obrero o pescador). En un descuento el Debe es la deuda con el trabajador y el Haber la entidad.
 */
const aprobarGerencia = async (id, usuarioId) => {
  try {
    if (!usuarioId) throw new ValidationError('No se pudo identificar al usuario que aprueba: su usuario no está asociado a un personal.');
    const planilla = await obtenerOFallar(id);
    if (Number(planilla.estadoId) !== ESTADO_PLANILLA.APROBADO_JEFE_PERSONAL) {
      throw new ConflictError('La planilla debe estar aprobada por la jefa de personal antes de la aprobación de gerencia.');
    }

    const trabajadores = await prisma.planillaTrabajador.findMany({
      where: { planillaId: id },
      include: {
        personal: {
          select: {
            id: true, nombres: true, apellidos: true,
            entidadPension: { select: { descripcion: true, cuentaPasivoEmpleadoId: true, cuentaPasivoObreroId: true } },
          },
        },
        conceptos: {
          include: {
            conceptoPlanilla: {
              select: { id: true, codigo: true, claveMotor: true, tipoDeudaId: true, pasivoEsDelTrabajador: true, cuentas: true },
            },
          },
        },
      },
    });
    if (trabajadores.length === 0) throw new ValidationError('La planilla no tiene boletas. Regenérela antes de aprobarla.');

    const fechaContable = new Date(planilla.fechaFin);
    const periodo = await periodoContableService.obtenerPeriodoPorFecha(planilla.empresaId, fechaContable);
    if (Number(periodo.estadoId) !== ESTADO_PERIODO_CONTABLE.ABIERTO) {
      throw new ValidationError(`El período contable ${periodo.nombrePeriodo} no está abierto: no se pueden crear los asientos de la planilla.`);
    }

    // Cuentas del asiento: Debe y Haber por concepto y categoría; se acumula en céntimos (Debe positivo, Haber negativo)
    const netoPorCuenta = new Map();
    const sinCuentas = new Set();
    for (const trabajador of trabajadores) {
      const categoria = trabajador.esPescador ? 'pescador' : trabajador.esObrero ? 'obrero' : 'empleado';
      for (const fila of trabajador.conceptos) {
        const centimos = Math.round(Number(fila.monto) * 100);
        if (centimos === 0) continue;
        const cuentas = fila.conceptoPlanilla.cuentas.find(
          (c) => Boolean(c.esPescador) === trabajador.esPescador && Boolean(c.esObrero) === (trabajador.esPescador ? false : trabajador.esObrero),
        );
        // Los conceptos de pensión (AFP/ONP) acreditan la cuenta de SU entidad (417101, 403201...), que depende del trabajador
        const esPension = Boolean(fila.conceptoPlanilla.claveMotor?.startsWith('PENSION_'));
        const entidad = trabajador.personal.entidadPension;
        const cuentaEntidad = esPension ? (trabajador.esObrero || trabajador.esPescador ? entidad?.cuentaPasivoObreroId : entidad?.cuentaPasivoEmpleadoId) : null;
        const cuentaHaber = cuentaEntidad || cuentas?.cuentaPasivoId;
        if (!cuentas?.cuentaGastoId || !cuentaHaber) {
          sinCuentas.add(
            esPension && !cuentaEntidad && !cuentas?.cuentaPasivoId
              ? `${fila.conceptoPlanilla.codigo} (${categoria}; la entidad ${entidad?.descripcion || 'de pensión'} no tiene cuenta para esta categoría)`
              : `${fila.conceptoPlanilla.codigo} (${categoria})`,
          );
          continue;
        }
        const debe = Number(cuentas.cuentaGastoId);
        const haber = Number(cuentaHaber);
        netoPorCuenta.set(debe, (netoPorCuenta.get(debe) || 0) + centimos);
        netoPorCuenta.set(haber, (netoPorCuenta.get(haber) || 0) - centimos);
      }
    }
    if (sinCuentas.size > 0) {
      throw new ValidationError(
        `Faltan las cuentas del Debe y del Haber para: ${[...sinCuentas].join(', ')}. Cree el concepto con sus cuentas en Conceptos de Planilla y regenere la planilla.`,
      );
    }

    const [moneda, submodulo, estadoAsiento] = await Promise.all([
      prisma.moneda.findFirst({ where: { codigoSunat: 'PEN' } }),
      prisma.submoduloSistema.findFirst({ where: { nombreModeloOrigen: MODELO_ORIGEN_PLANILLA, activo: true } }),
      prisma.estadoMultiFuncion.findUnique({ where: { id: ESTADO_ASIENTO_CONTABLE.PENDIENTE } }),
    ]);
    if (!moneda) throw new ValidationError('No se encontró la moneda PEN (soles).');
    if (!submodulo) {
      throw new ValidationError(
        `No existe el submódulo "Planillas" con modelo origen "${MODELO_ORIGEN_PLANILLA}". Créelo en Submódulos Sistema (ruta planilla, módulo Recursos Humanos) antes de aprobar.`,
      );
    }
    if (!estadoAsiento) throw new ValidationError('No se encontró el estado PENDIENTE para asientos contables.');

    const cuentasPlan = await prisma.planCuentasContable.findMany({
      where: { id: { in: [...netoPorCuenta.keys()] } },
      select: { id: true, codigoCuenta: true },
    });
    const codigoPorCuenta = new Map(cuentasPlan.map((c) => [Number(c.id), c.codigoCuenta]));
    const lineas = [...netoPorCuenta.entries()]
      .filter(([, neto]) => neto !== 0)
      .map(([cuentaId, neto]) => ({ cuentaId, debe: neto > 0 ? neto / 100 : 0, haber: neto < 0 ? -neto / 100 : 0 }))
      .sort((a, b) => Number(a.haber > 0) - Number(b.haber > 0) || String(codigoPorCuenta.get(a.cuentaId)).localeCompare(String(codigoPorCuenta.get(b.cuentaId))));
    if (lineas.length === 0) throw new ValidationError('La planilla no tiene montos para contabilizar.');
    const totalDebe = lineas.reduce((suma, l) => suma + Math.round(l.debe * 100), 0) / 100;
    const totalHaber = lineas.reduce((suma, l) => suma + Math.round(l.haber * 100), 0) / 100;

    const glosa = `PLANILLA ${planilla.descripcion}`.toUpperCase().slice(0, 250);
    const fechaVencimiento = planilla.fechaPago ? new Date(planilla.fechaPago) : fechaContable;

    await prisma.$transaction(
      async (tx) => {
        // 1. Deudas con el personal: por trabajador y tipo de deuda, ingresos menos descuentos del mismo tipo
        const deudasCreadas = [];
        for (const trabajador of trabajadores) {
          const porTipo = new Map();
          for (const fila of trabajador.conceptos) {
            const { tipoDeudaId, pasivoEsDelTrabajador } = fila.conceptoPlanilla;
            if (!tipoDeudaId || !pasivoEsDelTrabajador) continue;
            const grupo = porTipo.get(Number(tipoDeudaId)) || { centimos: 0, filas: [] };
            const centimos = Math.round(Number(fila.monto) * 100);
            if (fila.naturaleza === 'INGRESO') grupo.centimos += centimos;
            else if (fila.naturaleza === 'DESCUENTO') grupo.centimos -= centimos;
            grupo.filas.push(fila);
            porTipo.set(Number(tipoDeudaId), grupo);
          }
          for (const [tipoDeudaId, grupo] of porTipo) {
            if (grupo.centimos < 0) {
              throw new ValidationError(
                `Los descuentos de ${trabajador.personal.apellidos} ${trabajador.personal.nombres} superan sus ingresos: corrija la boleta antes de aprobar.`,
              );
            }
            if (grupo.centimos === 0) continue;
            const monto = grupo.centimos / 100;
            const deuda = await tx.deudaConPersonal.create({
              data: {
                empresaId: planilla.empresaId,
                personalId: trabajador.personalId,
                tipoDeudaId,
                moduloOrigenId: MODULO_RECURSOS_HUMANOS_ID,
                origenId: planilla.id,
                fecha: fechaContable,
                fechaVencimiento,
                numeroDocumento: `PLN-${planilla.id}`,
                montoPagadoAnterior: 0,
                montoOriginal: monto,
                montoPagado: 0,
                saldoPendiente: monto,
                monedaId: moneda.id,
                estadoId: ESTADO_DEUDA_PERSONAL_PENDIENTE,
                esGerencial: false,
                esSaldoInicial: false,
                fechaContable,
                periodoContableId: periodo.id,
                observaciones: planilla.descripcion,
                creadoPor: usuarioId,
              },
            });
            deudasCreadas.push(deuda.id);
            await tx.planillaTrabajadorConcepto.updateMany({
              where: { id: { in: grupo.filas.map((f) => f.id) } },
              data: { deudaConPersonalId: deuda.id },
            });
          }
        }

        // 2. Asiento contable de la planilla
        const ultimo = await tx.asientoContable.findFirst({
          where: { empresaId: planilla.empresaId, periodoContableId: periodo.id },
          orderBy: { correlativo: 'desc' },
        });
        const correlativo = ultimo ? Number(ultimo.correlativo) + 1 : 1;
        const asiento = await tx.asientoContable.create({
          data: {
            empresaId: planilla.empresaId,
            periodoContableId: periodo.id,
            numeroAsiento: `ASI-${fechaContable.getUTCFullYear()}-${String(correlativo).padStart(6, '0')}`,
            correlativo,
            fechaAsiento: fechaContable,
            glosa,
            tipoLibro: 'FISCAL',
            tipoLibroId: TIPO_LIBRO.PLANILLAS,
            esGerencial: false,
            esSaldoInicial: false,
            origenAsiento: 'AUTOMATICO',
            submoduloOrigenId: submodulo.id,
            procesoOrigenId: planilla.id,
            estadoId: estadoAsiento.id,
            totalDebe,
            totalHaber,
            diferencia: 0,
            estaCuadrado: totalDebe === totalHaber,
            monedaId: moneda.id,
            tipoCambio: 1,
            creadoPor: usuarioId,
            detalles: {
              create: lineas.map((l, indice) => ({
                numeroLinea: indice + 1,
                planCuentaId: l.cuentaId,
                glosa,
                debe: l.debe,
                haber: l.haber,
                monedaId: moneda.id,
                tipoCambio: 1,
                debeMonedaExtranjera: null,
                haberMonedaExtranjera: null,
                submoduloOrigenLineaId: submodulo.id,
                procesoOrigenLineaId: planilla.id,
                creadoPor: usuarioId,
              })),
            },
          },
        });
        for (const deudaId of deudasCreadas) {
          await tx.deudaConPersonal.update({ where: { id: deudaId }, data: { asientosContables: { connect: { id: asiento.id } } } });
        }

        // 3. La planilla queda aprobada por gerencia
        await tx.planilla.update({
          where: { id },
          data: {
            estadoId: ESTADO_PLANILLA.APROBADO_GERENCIA,
            aprobadaGerentePor: usuarioId,
            aprobadaGerenteEn: new Date(),
            actualizadoPor: usuarioId,
          },
        });
      },
      { timeout: 120000 },
    );
    return await obtenerOFallar(id, incluirDetalle);
  } catch (err) {
    manejarError(err, 'aprobar la planilla como gerencia');
  }
};

/**
 * Revierte la aprobación de gerencia: elimina las deudas con el personal y el asiento contable que creó la planilla y la
 * deja APROBADA POR LA JEFA DE PERSONAL. Solo es posible si ninguna deuda tiene pagos y el asiento sigue PENDIENTE
 * (no aprobado) en un período contable abierto; si no, el mensaje dice qué hay que deshacer primero.
 */
const revertirAprobacionGerencia = async (id, usuarioId = null) => {
  try {
    const planilla = await obtenerOFallar(id);
    if (Number(planilla.estadoId) !== ESTADO_PLANILLA.APROBADO_GERENCIA) {
      throw new ConflictError('Solo se puede revertir una planilla APROBADA POR GERENCIA.');
    }

    const filas = await prisma.planillaTrabajadorConcepto.findMany({
      where: { planillaTrabajador: { planillaId: id }, deudaConPersonalId: { not: null } },
      select: { deudaConPersonalId: true },
    });
    const deudaIds = [...new Set(filas.map((f) => Number(f.deudaConPersonalId)))];
    const deudas = await prisma.deudaConPersonal.findMany({
      where: { id: { in: deudaIds } },
      include: { personal: { select: { nombres: true, apellidos: true } }, _count: { select: { pagos: true } } },
    });
    const conPagos = deudas.filter((d) => Number(d.montoPagado) > 0 || d._count.pagos > 0);
    if (conPagos.length > 0) {
      throw new ConflictError(
        `No se puede revertir: ya se pagó ${conPagos.length} deuda(s) generada(s) por la planilla (${conPagos
          .slice(0, 5)
          .map((d) => `${d.personal.apellidos} ${d.personal.nombres}`)
          .join(', ')}${conPagos.length > 5 ? '...' : ''}). Revierta primero esos pagos.`,
      );
    }

    const submodulo = await prisma.submoduloSistema.findFirst({ where: { nombreModeloOrigen: MODELO_ORIGEN_PLANILLA, activo: true } });
    const asientos = submodulo
      ? await prisma.asientoContable.findMany({
          where: { submoduloOrigenId: submodulo.id, procesoOrigenId: id },
          include: { periodoContable: { select: { estadoId: true, nombrePeriodo: true } } },
        })
      : [];
    const asientoAprobado = asientos.find((a) => Number(a.estadoId) !== ESTADO_ASIENTO_CONTABLE.PENDIENTE);
    if (asientoAprobado) {
      throw new ConflictError(`No se puede revertir: el asiento ${asientoAprobado.numeroAsiento} de la planilla ya no está PENDIENTE. Anúlelo primero en Contabilidad.`);
    }
    const periodoCerrado = asientos.find((a) => Number(a.periodoContable.estadoId) !== ESTADO_PERIODO_CONTABLE.ABIERTO);
    if (periodoCerrado) {
      throw new ConflictError(`No se puede revertir: el período contable ${periodoCerrado.periodoContable.nombrePeriodo} del asiento no está abierto.`);
    }

    await prisma.$transaction(
      async (tx) => {
        await tx.planillaTrabajadorConcepto.updateMany({
          where: { planillaTrabajador: { planillaId: id }, deudaConPersonalId: { not: null } },
          data: { deudaConPersonalId: null },
        });
        const asientoIds = asientos.map((a) => a.id);
        await tx.detalleAsientoContable.deleteMany({ where: { asientoContableId: { in: asientoIds } } });
        await tx.asientoContable.deleteMany({ where: { id: { in: asientoIds } } });
        await tx.deudaConPersonal.deleteMany({ where: { id: { in: deudaIds } } });
        await tx.planilla.update({
          where: { id },
          data: {
            estadoId: ESTADO_PLANILLA.APROBADO_JEFE_PERSONAL,
            aprobadaGerentePor: null,
            aprobadaGerenteEn: null,
            actualizadoPor: usuarioId,
          },
        });
      },
      { timeout: 60000 },
    );
    return await obtenerOFallar(id, incluirDetalle);
  } catch (err) {
    manejarError(err, 'revertir la aprobación de la planilla');
  }
};

// Tipos de documento de SUNAT (TiposDocIdentidad.codSunat) → código de AFPnet
const TIPO_DOCUMENTO_AFPNET = { 1: 0, 4: 1, 7: 4 };

const indiceDia = (fecha) => Math.floor(new Date(fecha).getTime() / (24 * 60 * 60 * 1000));

/**
 * Filas del archivo "Declarar aportes" de AFPnet (17 columnas del modelo oficial, sin las filas de instrucciones).
 * AFPnet se declara UNA vez al mes (hasta el 5.º día del mes siguiente) aunque la planilla sea semanal o quincenal:
 * se consolidan todas las planillas de la empresa cuyo periodo termina en el mes y se suma la remuneración asegurable
 * por trabajador y tipo de trabajo (N normal, P pesquero). La ONP y las locaciones no van en este archivo.
 * La AFP se deja en blanco: AFPnet la deduce del CUSPP.
 */
/**
 * Planillas de una empresa que terminan en el mes: los archivos de AFPnet y PLAME son mensuales aunque la planilla
 * sea semanal o quincenal. Todas deben estar aprobadas por gerencia para no declarar un mes incompleto.
 */
const planillasAprobadasDelMes = async (empresaId, anio, mes, archivo) => {
  empresaId = Number(empresaId);
  anio = Number(anio);
  mes = Number(mes);
  if (!empresaId) throw new ValidationError(`Seleccione la empresa del archivo de ${archivo}.`);
  if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
    throw new ValidationError(`Indique un año y un mes válidos para el archivo de ${archivo}.`);
  }
  const inicioMes = new Date(Date.UTC(anio, mes - 1, 1));
  const finMes = new Date(Date.UTC(anio, mes, 0));
  const planillas = await prisma.planilla.findMany({
    where: { empresaId, fechaFin: { gte: inicioMes, lt: new Date(Date.UTC(anio, mes, 1)) } },
    select: { id: true, descripcion: true, estadoId: true },
  });
  if (planillas.length === 0) throw new ValidationError(`La empresa no tiene planillas que terminen en ${String(mes).padStart(2, '0')}/${anio}.`);
  const sinAprobar = planillas.filter((p) => Number(p.estadoId) !== ESTADO_PLANILLA.APROBADO_GERENCIA);
  if (sinAprobar.length > 0) {
    throw new ConflictError(
      `Hay planillas del mes sin aprobar por gerencia: ${sinAprobar.map((p) => p.descripcion).join(', ')}. Apruébelas antes de generar el archivo de ${archivo}.`,
    );
  }
  return { empresaId, anio, mes, inicioMes, finMes, planillas };
};

const obtenerDatosAfpnet = async (empresaIdParam, anioParam, mesParam) => {
  try {
    const { empresaId, anio, mes, inicioMes, finMes, planillas } = await planillasAprobadasDelMes(empresaIdParam, anioParam, mesParam, 'AFPnet');

    const trabajadores = await prisma.planillaTrabajador.findMany({
      where: { planillaId: { in: planillas.map((p) => p.id) }, contratoPersonal: { esLocacionServicios: false } },
      include: {
        personal: {
          select: {
            id: true, nombres: true, apellidos: true, apellidoPaterno: true, apellidoMaterno: true, numeroDocumento: true, cuspp: true,
            fechaIngreso: true, fechaCese: true,
            tipoDocIdentidad: { select: { codSunat: true, nombre: true } },
            entidadPension: { select: { esOnp: true } },
          },
        },
        conceptos: { include: { conceptoPlanilla: { select: { afectaAfpOnp: true } } } },
      },
    });

    const agrupado = new Map();
    const sinCuspp = new Set();
    for (const t of trabajadores) {
      if (!t.personal.entidadPension || t.personal.entidadPension.esOnp) continue;
      if (!t.personal.cuspp) {
        sinCuspp.add(`${t.personal.apellidos} ${t.personal.nombres}`);
        continue;
      }
      const tipoTrabajo = t.esPescador ? 'P' : 'N';
      const clave = `${t.personalId}-${tipoTrabajo}`;
      const remuneracion = t.conceptos
        .filter((c) => c.naturaleza === 'INGRESO' && c.conceptoPlanilla.afectaAfpOnp)
        .reduce((suma, c) => suma + Number(c.monto), 0);
      const fila = agrupado.get(clave) || { personal: t.personal, tipoTrabajo, remuneracion: 0 };
      fila.remuneracion += remuneracion;
      agrupado.set(clave, fila);
    }
    if (sinCuspp.size > 0) {
      throw new ValidationError(`Faltan el CUSPP de: ${[...sinCuspp].join(', ')}. Regístrelo en Personal, datos laborales y de planilla.`);
    }

    const inicio = indiceDia(inicioMes);
    const fin = indiceDia(finMes);
    const enPeriodo = (fecha) => Boolean(fecha) && indiceDia(fecha) >= inicio && indiceDia(fecha) <= fin;

    const filas = [...agrupado.values()]
      .sort((a, b) => a.personal.apellidos.localeCompare(b.personal.apellidos))
      .map(({ personal, tipoTrabajo, remuneracion }, indice) => {
        const codigoSunat = Number(personal.tipoDocIdentidad?.codSunat);
        if (!(codigoSunat in TIPO_DOCUMENTO_AFPNET)) {
          throw new ValidationError(
            `El tipo de documento ${personal.tipoDocIdentidad?.nombre || 'sin tipo'} de ${personal.apellidos} ${personal.nombres} no tiene equivalencia en AFPnet (se admiten DNI, carnet de extranjería y pasaporte).`,
          );
        }
        // Registros anteriores a los apellidos separados: se parte en el primer espacio
        const [paterno, ...resto] = personal.apellidos.trim().split(/\s+/);
        return {
          secuencia: indice + 1,
          cuspp: personal.cuspp,
          tipoDocumento: TIPO_DOCUMENTO_AFPNET[codigoSunat],
          numeroDocumento: personal.numeroDocumento,
          apellidoPaterno: personal.apellidoPaterno || paterno,
          apellidoMaterno: personal.apellidoMaterno ?? resto.join(' '),
          nombres: personal.nombres,
          // N = pago posterior al cese: el trabajador cesó antes de que empezara el mes declarado
          relacionLaboral: personal.fechaCese && indiceDia(personal.fechaCese) < inicio ? 'N' : 'S',
          inicioRelacionLaboral: enPeriodo(personal.fechaIngreso) ? 'S' : 'N',
          ceseRelacionLaboral: enPeriodo(personal.fechaCese) ? 'S' : 'N',
          excepcionAportar: '',
          remuneracionAsegurable: Math.round((remuneracion + Number.EPSILON) * 100) / 100,
          aporteVoluntarioConFinPrevisional: 0,
          aporteVoluntarioSinFinPrevisional: 0,
          aporteVoluntarioEmpleador: 0,
          tipoTrabajo,
          afp: '',
        };
      });
    if (filas.length === 0) throw new ValidationError('Las planillas del mes no tienen trabajadores afiliados a una AFP para declarar en AFPnet.');

    return { periodo: { empresaId, anio, mes, planillas: planillas.map((p) => p.descripcion) }, filas };
  } catch (err) {
    manejarError(err, 'preparar el archivo de AFPnet');
  }
};

// Tabla 3 de PLAME: tipos de documento admitidos en los archivos de importación (Anexo 3, estructura 18)
const TIPOS_DOCUMENTO_PLAME = ['01', '04', '07', '09', '22', '23', '24', '26'];

// Totales de la tabla 22 que PLAME calcula solo: el Anexo 3 prohíbe incluirlos en el .rem
const CODIGOS_PLAME_PROHIBIDOS = ['0100', '0200', '0300', '0400', '0500', '0600', '0603', '0604', '0607', '0610', '0612', '0616', '0800', '0802', '0804', '0806', '0808'];

/**
 * Líneas del archivo PLAME de remuneraciones (.rem, estructura 18 del Anexo 3): por trabajador y concepto de la
 * tabla 22, con el monto devengado y el pagado/descontado del mes. Consolida todas las planillas del mes.
 * Solo van ingresos y descuentos; los aportes del empleador y las provisiones los calcula PLAME o no se declaran.
 * Las locaciones de servicio (4ta categoría) no van en este archivo.
 */
const obtenerDatosPlame = async (empresaIdParam, anioParam, mesParam) => {
  try {
    const { empresaId, anio, mes, planillas } = await planillasAprobadasDelMes(empresaIdParam, anioParam, mesParam, 'PLAME');
    const empresa = await prisma.empresa.findUnique({ where: { id: empresaId }, select: { ruc: true, razonSocial: true } });
    if (!empresa?.ruc) throw new ValidationError('La empresa no tiene RUC registrado; el nombre del archivo de PLAME lo necesita.');

    const trabajadores = await prisma.planillaTrabajador.findMany({
      where: { planillaId: { in: planillas.map((p) => p.id) }, contratoPersonal: { esLocacionServicios: false } },
      include: {
        personal: {
          select: { nombres: true, apellidos: true, numeroDocumento: true, tipoDocIdentidad: { select: { codSunat: true, nombre: true } } },
        },
        conceptos: { include: { conceptoPlanilla: { select: { codigo: true, descripcion: true, codigoPlame: true } } } },
      },
    });

    const acumulado = new Map();
    const sinCodigo = new Set();
    for (const t of trabajadores) {
      const tipoDocumento = String(t.personal.tipoDocIdentidad?.codSunat ?? '').padStart(2, '0');
      if (!TIPOS_DOCUMENTO_PLAME.includes(tipoDocumento)) {
        throw new ValidationError(
          `El tipo de documento ${t.personal.tipoDocIdentidad?.nombre || 'sin tipo'} de ${t.personal.apellidos} ${t.personal.nombres} no es admitido por PLAME (01, 04, 07, 09, 22, 23, 24 y 26).`,
        );
      }
      for (const c of t.conceptos) {
        if (c.naturaleza !== 'INGRESO' && c.naturaleza !== 'DESCUENTO') continue;
        if (Number(c.monto) === 0) continue;
        const codigo = String(c.conceptoPlanilla.codigoPlame || '').trim().padStart(4, '0');
        if (!c.conceptoPlanilla.codigoPlame) {
          sinCodigo.add(`${c.conceptoPlanilla.codigo} - ${c.conceptoPlanilla.descripcion}`);
          continue;
        }
        // Códigos que PLAME calcula por su cuenta (p. ej. 0607 SNP/ONP): el concepto es correcto en la planilla, pero no se declara
        if (CODIGOS_PLAME_PROHIBIDOS.includes(codigo)) continue;
        const clave = `${t.personalId}-${codigo}`;
        const fila = acumulado.get(clave) || { tipoDocumento, numeroDocumento: t.personal.numeroDocumento, codigo, monto: 0, apellidos: t.personal.apellidos };
        fila.monto += Number(c.monto);
        acumulado.set(clave, fila);
      }
    }
    if (sinCodigo.size > 0) {
      throw new ValidationError(`Estos conceptos no tienen código de la tabla 22 de SUNAT: ${[...sinCodigo].join('; ')}. Regístrelo en Conceptos de Planilla.`);
    }
    if (acumulado.size === 0) throw new ValidationError('Las planillas del mes no tienen ingresos ni descuentos para declarar en PLAME.');

    const importe = (valor) => (Math.round((valor + Number.EPSILON) * 100) / 100).toFixed(2);
    // Una línea por trabajador y concepto: tipo|documento|concepto|devengado|pagado|  (campos separados por "|")
    const lineas = [...acumulado.values()]
      .sort((a, b) => a.apellidos.localeCompare(b.apellidos) || a.codigo.localeCompare(b.codigo))
      .map((f) => `${f.tipoDocumento}|${f.numeroDocumento}|${f.codigo}|${importe(f.monto)}|${importe(f.monto)}|`);
    return {
      periodo: { empresaId, anio, mes, planillas: planillas.map((p) => p.descripcion) },
      nombreArchivo: `0601${anio}${String(mes).padStart(2, '0')}${empresa.ruc}.rem`,
      lineas,
    };
  } catch (err) {
    manejarError(err, 'preparar el archivo de PLAME');
  }
};

/** Solo se elimina una planilla PENDIENTE (sin deudas ni asientos). */
const eliminar = async (id) => {
  try {
    const planilla = await obtenerOFallar(id);
    if (Number(planilla.estadoId) !== ESTADO_PLANILLA.PENDIENTE) {
      throw new ConflictError('Solo se puede eliminar una planilla PENDIENTE. Reábrala primero si está aprobada por la jefa de personal.');
    }
    await prisma.planilla.delete({ where: { id } });
    return true;
  } catch (err) {
    manejarError(err, 'eliminar la planilla');
  }
};

export default {
  listar, obtenerPorId, generar, regenerar, corregirConcepto, aprobarJefePersonal, reabrir, aprobarGerencia,
  revertirAprobacionGerencia, obtenerDatosAfpnet, obtenerDatosPlame, eliminar,
};
