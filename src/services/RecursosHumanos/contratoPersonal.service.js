import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD de ContratoPersonal y sus líneas de pago.
 *
 * La modalidad de pago la define el contrato: planilla o locación de servicios (honorarios).
 * Una persona puede tener ambos a la vez (ej. motorista con sueldo y además contrato de locación por faena),
 * pero no dos contratos activos del mismo tipo con fechas que se crucen en la misma empresa.
 * Un cambio de sueldo se registra como un contrato nuevo con su vigencia.
 */

const PERIODICIDADES_VALIDAS = [7, 15, 30];

const manejarError = (err, contexto) => {
  if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
  if (err.code && String(err.code).startsWith('P')) {
    throw new DatabaseError(`Error de base de datos al ${contexto}`, err.message);
  }
  throw err;
};

const incluirRelaciones = {
  empresa: { select: { id: true, razonSocial: true } },
  personal: { select: { id: true, nombres: true, apellidos: true, numeroDocumento: true, cesado: true } },
  lineasPago: { orderBy: { orden: 'asc' } },
};

const aFecha = (valor, etiqueta) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) throw new ValidationError(`${etiqueta} no es una fecha válida.`);
  return fecha;
};

const camposEditables = (data) => {
  const campos = {};
  if (data.empresaId !== undefined) campos.empresaId = Number(data.empresaId);
  if (data.personalId !== undefined) campos.personalId = Number(data.personalId);
  if (data.esLocacionServicios !== undefined) campos.esLocacionServicios = Boolean(data.esLocacionServicios);
  if (data.fechaInicio !== undefined) campos.fechaInicio = aFecha(data.fechaInicio, 'La fecha de inicio del contrato');
  if (data.fechaFin !== undefined) campos.fechaFin = data.fechaFin ? aFecha(data.fechaFin, 'La fecha de fin del contrato') : null;
  if (data.remuneracionBasica !== undefined && data.remuneracionBasica !== null && data.remuneracionBasica !== '') {
    campos.remuneracionBasica = Number(data.remuneracionBasica);
  }
  if (data.esJornal !== undefined) campos.esJornal = Boolean(data.esJornal);
  if (data.periodicidadDias !== undefined) {
    campos.periodicidadDias = data.periodicidadDias === null || data.periodicidadDias === '' ? null : Number(data.periodicidadDias);
  }
  if (data.pagaPorTemporada !== undefined) campos.pagaPorTemporada = Boolean(data.pagaPorTemporada);
  if (data.liquidaBeneficiosEnBoleta !== undefined) campos.liquidaBeneficiosEnBoleta = Boolean(data.liquidaBeneficiosEnBoleta);
  if (data.activo !== undefined) campos.activo = Boolean(data.activo);
  return campos;
};

/** Normaliza y valida las líneas de pago: una sola forma por línea; el saldo es único y va al final. */
function normalizarLineasPago(lineas = []) {
  const normalizadas = lineas.map((linea, indice) => {
    const monto = linea.monto === null || linea.monto === undefined || linea.monto === '' ? null : Number(linea.monto);
    const porcentaje =
      linea.porcentaje === null || linea.porcentaje === undefined || linea.porcentaje === '' ? null : Number(linea.porcentaje);
    const esCalculada = Boolean(linea.esCalculada);
    const esSaldo = Boolean(linea.esSaldo);
    const posicion = indice + 1;

    const formas = [monto !== null, porcentaje !== null, esCalculada, esSaldo].filter(Boolean).length;
    if (formas !== 1) {
      throw new ValidationError(
        `La línea de pago ${posicion} debe usar una sola forma: monto fijo, porcentaje, calculada o saldo.`,
      );
    }
    if (monto !== null && (Number.isNaN(monto) || monto <= 0)) {
      throw new ValidationError(`El monto de la línea de pago ${posicion} debe ser mayor a cero.`);
    }
    if (porcentaje !== null && (Number.isNaN(porcentaje) || porcentaje <= 0 || porcentaje > 100)) {
      throw new ValidationError(`El porcentaje de la línea de pago ${posicion} debe estar entre 0 y 100.`);
    }
    return {
      orden: posicion,
      esPlanilla: linea.esPlanilla === undefined ? true : Boolean(linea.esPlanilla),
      monto,
      porcentaje,
      esCalculada,
      esSaldo,
    };
  });

  const saldos = normalizadas.filter((l) => l.esSaldo);
  if (saldos.length > 1) throw new ValidationError('Solo puede haber una línea de saldo en el contrato.');
  if (saldos.length === 1 && !normalizadas[normalizadas.length - 1].esSaldo) {
    throw new ValidationError('La línea de saldo debe ser la última del contrato.');
  }
  const totalPorcentaje = normalizadas.reduce((suma, l) => suma + (l.porcentaje || 0), 0);
  if (totalPorcentaje > 100) {
    throw new ValidationError(`Los porcentajes de las líneas de pago suman ${totalPorcentaje}%: no pueden superar 100%.`);
  }
  return normalizadas;
}

async function validar(campos, id = null, actual = null) {
  const empresaId = campos.empresaId ?? actual?.empresaId;
  const personalId = campos.personalId ?? actual?.personalId;
  const esLocacionServicios = campos.esLocacionServicios ?? actual?.esLocacionServicios ?? false;
  const fechaInicio = campos.fechaInicio ?? actual?.fechaInicio;
  const fechaFin = campos.fechaFin !== undefined ? campos.fechaFin : actual?.fechaFin ?? null;
  const pagaPorTemporada = campos.pagaPorTemporada ?? actual?.pagaPorTemporada ?? false;
  const periodicidadDias = campos.periodicidadDias !== undefined ? campos.periodicidadDias : actual?.periodicidadDias ?? null;
  const activo = campos.activo ?? actual?.activo ?? true;

  if (!empresaId) throw new ValidationError('Seleccione la empresa del contrato.');
  if (!personalId) throw new ValidationError('Seleccione el trabajador del contrato.');
  if (!fechaInicio) throw new ValidationError('La fecha de inicio del contrato es obligatoria.');
  if (fechaFin && fechaFin < fechaInicio) {
    throw new ValidationError('La fecha de fin del contrato no puede ser anterior a la de inicio.');
  }
  if (campos.remuneracionBasica !== undefined && (Number.isNaN(campos.remuneracionBasica) || campos.remuneracionBasica <= 0)) {
    throw new ValidationError('La remuneración básica debe ser mayor a cero.');
  }
  if (!pagaPorTemporada && !PERIODICIDADES_VALIDAS.includes(periodicidadDias)) {
    throw new ValidationError('Indique cada cuántos días se paga (7, 15 o 30) o marque "Se paga por temporada".');
  }

  const [empresa, personal] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: empresaId }, select: { id: true } }),
    prisma.personal.findUnique({ where: { id: personalId }, select: { id: true, empresaId: true, nombres: true, apellidos: true } }),
  ]);
  if (!empresa) throw new ValidationError('La empresa indicada no existe.');
  if (!personal) throw new ValidationError('El trabajador indicado no existe.');
  if (Number(personal.empresaId) !== Number(empresaId)) {
    throw new ValidationError(
      `El trabajador ${personal.apellidos} ${personal.nombres} pertenece a otra empresa: el contrato debe registrarse en su empresa.`,
    );
  }

  // Dos contratos activos del mismo tipo no pueden cruzarse en fechas
  if (activo) {
    const cruce = await prisma.contratoPersonal.findFirst({
      where: {
        personalId,
        empresaId,
        esLocacionServicios,
        activo: true,
        ...(id && { id: { not: id } }),
        AND: [
          { OR: [{ fechaFin: null }, { fechaFin: { gte: fechaInicio } }] },
          ...(fechaFin ? [{ fechaInicio: { lte: fechaFin } }] : []),
        ],
      },
    });
    if (cruce) {
      throw new ConflictError(
        `${personal.apellidos} ${personal.nombres} ya tiene un contrato ${esLocacionServicios ? 'de locación' : 'de planilla'} activo que se cruza con estas fechas. Cierre el anterior (fecha de fin) antes de registrar el nuevo.`,
      );
    }
  }
}

const listar = async (filtros = {}) => {
  try {
    const where = {};
    if (filtros.empresaId) where.empresaId = Number(filtros.empresaId);
    if (filtros.personalId) where.personalId = Number(filtros.personalId);
    if (filtros.esLocacionServicios !== undefined && filtros.esLocacionServicios !== '') {
      where.esLocacionServicios = filtros.esLocacionServicios === 'true' || filtros.esLocacionServicios === true;
    }
    if (filtros.activo !== undefined && filtros.activo !== '') {
      where.activo = filtros.activo === 'true' || filtros.activo === true;
    }
    return await prisma.contratoPersonal.findMany({
      where,
      include: incluirRelaciones,
      orderBy: [{ empresaId: 'asc' }, { personalId: 'asc' }, { fechaInicio: 'desc' }],
    });
  } catch (err) {
    manejarError(err, 'listar los contratos de personal');
  }
};

const obtenerPorId = async (id) => {
  try {
    const contrato = await prisma.contratoPersonal.findUnique({ where: { id }, include: incluirRelaciones });
    if (!contrato) throw new NotFoundError('Contrato de personal no encontrado');
    return contrato;
  } catch (err) {
    manejarError(err, 'obtener el contrato de personal');
  }
};

const crear = async (data) => {
  try {
    const campos = camposEditables(data);
    if (campos.remuneracionBasica === undefined) throw new ValidationError('La remuneración básica es obligatoria.');
    await validar(campos);
    const lineas = normalizarLineasPago(data.lineasPago);
    return await prisma.contratoPersonal.create({
      data: {
        ...campos,
        creadoPor: data.creadoPor || null,
        lineasPago: { create: lineas },
      },
      include: incluirRelaciones,
    });
  } catch (err) {
    manejarError(err, 'crear el contrato de personal');
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.contratoPersonal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Contrato de personal no encontrado');
    const campos = camposEditables(data);
    await validar(campos, id, existente);
    const lineas = data.lineasPago !== undefined ? normalizarLineasPago(data.lineasPago) : null;

    return await prisma.$transaction(async (tx) => {
      // Las líneas se reemplazan completas: el orden y el saldo final se validan como un conjunto
      if (lineas) {
        await tx.contratoPersonalLineaPago.deleteMany({ where: { contratoPersonalId: id } });
        await tx.contratoPersonalLineaPago.createMany({
          data: lineas.map((linea) => ({ ...linea, contratoPersonalId: id })),
        });
      }
      return await tx.contratoPersonal.update({
        where: { id },
        data: { ...campos, actualizadoPor: data.actualizadoPor || null },
        include: incluirRelaciones,
      });
    });
  } catch (err) {
    manejarError(err, 'actualizar el contrato de personal');
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.contratoPersonal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Contrato de personal no encontrado');
    await prisma.contratoPersonal.delete({ where: { id } });
    return true;
  } catch (err) {
    manejarError(err, 'eliminar el contrato de personal');
  }
};

export default { listar, obtenerPorId, crear, actualizar, eliminar };
