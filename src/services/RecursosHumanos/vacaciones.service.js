import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import parametroLegalService from './parametroLegal.service.js';

/**
 * Módulo de vacaciones y suspensiones de labores.
 *  - Tipos de suspensión (catálogo PLAME tabla 21) con indicadores que definen cómo los trata la planilla.
 *  - Periodos vacacionales: el derecho de cada trabajador, un registro por año de servicios completo.
 *  - Suspensiones: cada tramo (vacaciones, faltas, descansos...) con estado PROGRAMADA | EJECUTADA | ANULADA.
 *  - Reportes: saldos, control vacacional, calendario, proyección y estadísticas.
 * Los días se manejan como días calendario enteros (las fechas se guardan a medianoche local, que en UTC cae el mismo día).
 */

const MS_DIA = 24 * 60 * 60 * 1000;
const ESTADOS = ['PROGRAMADA', 'EJECUTADA', 'ANULADA'];
// Mes comercial de respaldo si el parámetro DIAS_BASE_MES no está cargado (igual que el motor de planilla)
const DIAS_BASE_MES_POR_DEFECTO = 30;

const indiceDia = (fecha) => Math.floor(new Date(fecha).getTime() / MS_DIA);
const desdeIndice = (indice) => new Date(indice * MS_DIA);
const diasEntre = (inicio, fin) => indiceDia(fin) - indiceDia(inicio) + 1;
const redondear = (valor) => Math.round((valor + Number.EPSILON) * 100) / 100;
const nombreCompleto = (p) => `${p.apellidos} ${p.nombres}`.trim();

const aFecha = (valor, etiqueta) => {
  const fecha = new Date(valor);
  if (valor === undefined || valor === null || valor === '' || Number.isNaN(fecha.getTime())) {
    throw new ValidationError(`${etiqueta} no es una fecha válida.`);
  }
  return fecha;
};

const sumarAnios = (fecha, anios) => {
  const f = new Date(fecha);
  f.setUTCFullYear(f.getUTCFullYear() + anios);
  return f;
};

const manejarError = (err, contexto) => {
  if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
  if (err.code && String(err.code).startsWith('P')) throw new DatabaseError(`Error de base de datos al ${contexto}`, err.message);
  throw err;
};

/** Días de la suspensión que caen dentro de un rango (recorta los extremos) */
const diasEnRango = (inicio, fin, desde, hasta) => {
  const a = Math.max(indiceDia(inicio), indiceDia(desde));
  const b = Math.min(indiceDia(fin), indiceDia(hasta));
  return Math.max(0, b - a + 1);
};

// ════════════════════════════════════════════════════════════
// TIPOS DE SUSPENSIÓN
// ════════════════════════════════════════════════════════════

const camposTipo = (data) => {
  const campos = {};
  if (data.codigoPlame !== undefined) campos.codigoPlame = String(data.codigoPlame).trim();
  if (data.descripcion !== undefined) campos.descripcion = String(data.descripcion).trim();
  for (const bandera of ['esDescansoVacacional', 'esSubsidio', 'conGoceRemuneracion', 'pagaMovilidad', 'activo']) {
    if (data[bandera] !== undefined) campos[bandera] = Boolean(data[bandera]);
  }
  return campos;
};

const validarTipo = (campos, esCreacion) => {
  if (esCreacion || campos.codigoPlame !== undefined) {
    if (!campos.codigoPlame || campos.codigoPlame.length > 5) {
      throw new ValidationError('Ingrese el código PLAME del tipo de suspensión (hasta 5 caracteres, por ejemplo 23).');
    }
  }
  if (esCreacion || campos.descripcion !== undefined) {
    if (!campos.descripcion) throw new ValidationError('Ingrese la descripción del tipo de suspensión.');
  }
  if (campos.esDescansoVacacional && campos.esSubsidio) {
    throw new ValidationError('Un tipo de suspensión no puede ser a la vez descanso vacacional y subsidio.');
  }
};

const listarTipos = async (filtros = {}) => {
  try {
    const where = {};
    if (filtros.activo !== undefined && filtros.activo !== '') where.activo = filtros.activo === 'true' || filtros.activo === true;
    return await prisma.tipoSuspensionLaboral.findMany({ where, orderBy: [{ codigoPlame: 'asc' }] });
  } catch (err) {
    manejarError(err, 'listar los tipos de suspensión');
  }
};

const crearTipo = async (data) => {
  try {
    const campos = camposTipo(data);
    validarTipo(campos, true);
    const duplicado = await prisma.tipoSuspensionLaboral.findUnique({ where: { codigoPlame: campos.codigoPlame } });
    if (duplicado) throw new ConflictError(`Ya existe el tipo de suspensión con código PLAME ${campos.codigoPlame} ("${duplicado.descripcion}").`);
    return await prisma.tipoSuspensionLaboral.create({ data: { ...campos, creadoPor: data.creadoPor || null } });
  } catch (err) {
    manejarError(err, 'crear el tipo de suspensión');
  }
};

const actualizarTipo = async (id, data) => {
  try {
    const existente = await prisma.tipoSuspensionLaboral.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de suspensión no encontrado');
    const campos = camposTipo(data);
    validarTipo({ ...existente, ...campos }, false);
    if (campos.codigoPlame && campos.codigoPlame !== existente.codigoPlame) {
      const duplicado = await prisma.tipoSuspensionLaboral.findUnique({ where: { codigoPlame: campos.codigoPlame } });
      if (duplicado) throw new ConflictError(`Ya existe el tipo de suspensión con código PLAME ${campos.codigoPlame}.`);
    }
    return await prisma.tipoSuspensionLaboral.update({ where: { id }, data: { ...campos, actualizadoPor: data.actualizadoPor || null } });
  } catch (err) {
    manejarError(err, 'actualizar el tipo de suspensión');
  }
};

const eliminarTipo = async (id) => {
  try {
    const existente = await prisma.tipoSuspensionLaboral.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de suspensión no encontrado');
    const [suspensiones, boletas] = await Promise.all([
      prisma.suspensionLaboral.count({ where: { tipoSuspensionLaboralId: id } }),
      prisma.planillaTrabajadorSuspension.count({ where: { tipoSuspensionLaboralId: id } }),
    ]);
    if (suspensiones + boletas > 0) {
      throw new ConflictError(
        `El tipo "${existente.descripcion}" tiene ${suspensiones} suspensión(es) y ${boletas} boleta(s) asociadas: no se puede eliminar. Desactívelo para que no se use más.`,
      );
    }
    await prisma.tipoSuspensionLaboral.delete({ where: { id } });
    return true;
  } catch (err) {
    manejarError(err, 'eliminar el tipo de suspensión');
  }
};

// ════════════════════════════════════════════════════════════
// PERIODOS VACACIONALES
// ════════════════════════════════════════════════════════════

/** Días de vacaciones por año de servicios según el régimen laboral de la empresa (parámetro VACACIONES_DIAS) */
const diasDerechoVigente = async (regimenLaboralId, fecha) => {
  const vigentes = await parametroLegalService.obtenerVigentes(fecha, regimenLaboralId);
  const parametro = vigentes.find((p) => p.clave === 'VACACIONES_DIAS');
  if (!parametro) {
    throw new ValidationError('No hay un parámetro legal VACACIONES_DIAS vigente para el régimen laboral de la empresa. Cárguelo en Parámetros Legales.');
  }
  return Number(parametro.valor);
};

/** Genera los periodos vacacionales que faltan de un trabajador: uno por cada año de servicios ya completo */
const generarPeriodos = async (personalId, usuarioId = null) => {
  try {
    const personal = await prisma.personal.findUnique({
      where: { id: personalId },
      select: { id: true, nombres: true, apellidos: true, fechaIngreso: true, fechaCese: true, cesado: true, empresaId: true },
    });
    if (!personal) throw new NotFoundError('Trabajador no encontrado');
    if (!personal.fechaIngreso) {
      throw new ValidationError(`${nombreCompleto(personal)} no tiene fecha de ingreso: complétela en su ficha de Personal para generar sus periodos vacacionales.`);
    }
    const empresa = await prisma.empresa.findUnique({ where: { id: personal.empresaId }, select: { regimenLaboralId: true } });
    const diasDerecho = await diasDerechoVigente(empresa?.regimenLaboralId, new Date());

    const hoy = indiceDia(new Date());
    const limite = personal.cesado && personal.fechaCese ? Math.min(hoy, indiceDia(personal.fechaCese)) : hoy;
    const existentes = new Set(
      (await prisma.periodoVacacional.findMany({ where: { personalId }, select: { numeroPeriodo: true } })).map((p) => p.numeroPeriodo),
    );

    const nuevos = [];
    for (let n = 1; n <= 80; n++) {
      const inicio = sumarAnios(personal.fechaIngreso, n - 1);
      const fin = desdeIndice(indiceDia(sumarAnios(personal.fechaIngreso, n)) - 1);
      if (indiceDia(fin) > limite) break; // el año de servicios todavía no se completa: aún no nace el derecho
      if (existentes.has(n)) continue;
      nuevos.push({
        personalId,
        numeroPeriodo: n,
        fechaInicio: inicio,
        fechaFin: fin,
        diasDerecho,
        // El descanso debe gozarse a más tardar al terminar el año siguiente a aquel en que se adquirió el derecho
        fechaLimiteGoce: sumarAnios(fin, 1),
        creadoPor: usuarioId,
      });
    }
    if (nuevos.length) await prisma.periodoVacacional.createMany({ data: nuevos });
    return { personalId, creados: nuevos.length };
  } catch (err) {
    manejarError(err, 'generar los periodos vacacionales');
  }
};

/** Genera los periodos de todos los trabajadores activos de una empresa; informa los que no se pudieron */
const generarPeriodosEmpresa = async (empresaId, usuarioId = null) => {
  try {
    const trabajadores = await prisma.personal.findMany({
      where: { empresaId, cesado: false, fechaIngreso: { not: null } },
      select: { id: true, nombres: true, apellidos: true },
    });
    let creados = 0;
    const omitidos = [];
    for (const t of trabajadores) {
      try {
        creados += (await generarPeriodos(Number(t.id), usuarioId)).creados;
      } catch (error) {
        omitidos.push({ personalId: Number(t.id), trabajador: nombreCompleto(t), motivo: error.message });
      }
    }
    return { trabajadores: trabajadores.length, creados, omitidos };
  } catch (err) {
    manejarError(err, 'generar los periodos vacacionales de la empresa');
  }
};

const actualizarPeriodo = async (id, data) => {
  try {
    const existente = await prisma.periodoVacacional.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Periodo vacacional no encontrado');
    const campos = {};
    if (data.diasVendidos !== undefined) {
      const vendidos = Number(data.diasVendidos);
      if (!Number.isInteger(vendidos) || vendidos < 0) throw new ValidationError('Los días vendidos deben ser un número entero mayor o igual a cero.');
      const tomados = await prisma.suspensionLaboral.aggregate({
        _sum: { dias: true },
        where: { periodoVacacionalId: id, estado: { not: 'ANULADA' } },
      });
      const comprometidos = Number(tomados._sum.dias || 0);
      if (vendidos + comprometidos > existente.diasDerecho) {
        throw new ValidationError(
          `No se pueden vender ${vendidos} días: el periodo tiene ${existente.diasDerecho} días de derecho y ${comprometidos} ya están gozados o programados.`,
        );
      }
      campos.diasVendidos = vendidos;
    }
    if (data.observaciones !== undefined) campos.observaciones = data.observaciones ? String(data.observaciones) : null;
    if (data.activo !== undefined) campos.activo = Boolean(data.activo);
    return await prisma.periodoVacacional.update({ where: { id }, data: { ...campos, actualizadoPor: data.actualizadoPor || null } });
  } catch (err) {
    manejarError(err, 'actualizar el periodo vacacional');
  }
};

// ════════════════════════════════════════════════════════════
// SUSPENSIONES (registro)
// ════════════════════════════════════════════════════════════

const incluirSuspension = {
  personal: { select: { id: true, nombres: true, apellidos: true, numeroDocumento: true } },
  tipoSuspensionLaboral: true,
  periodoVacacional: { select: { id: true, numeroPeriodo: true, fechaInicio: true, fechaFin: true, diasDerecho: true } },
};

/** Días libres de un periodo: derecho - vendidos - suspensiones vacacionales no anuladas (se puede excluir una al editarla) */
const saldoLibrePeriodo = async (periodoId, excluirSuspensionId = null) => {
  const periodo = await prisma.periodoVacacional.findUnique({ where: { id: periodoId } });
  if (!periodo) throw new ValidationError('El periodo vacacional indicado no existe.');
  const usados = await prisma.suspensionLaboral.aggregate({
    _sum: { dias: true },
    where: { periodoVacacionalId: periodoId, estado: { not: 'ANULADA' }, ...(excluirSuspensionId ? { id: { not: excluirSuspensionId } } : {}) },
  });
  return { periodo, libres: periodo.diasDerecho - periodo.diasVendidos - Number(usados._sum.dias || 0) };
};

const validarSuspension = async (campos, idActual = null) => {
  const personal = await prisma.personal.findUnique({
    where: { id: campos.personalId },
    select: { id: true, nombres: true, apellidos: true, fechaIngreso: true },
  });
  if (!personal) throw new ValidationError('El trabajador indicado no existe.');
  const tipo = await prisma.tipoSuspensionLaboral.findUnique({ where: { id: campos.tipoSuspensionLaboralId } });
  if (!tipo) throw new ValidationError('El tipo de suspensión indicado no existe.');
  if (!tipo.activo && !idActual) throw new ValidationError(`El tipo de suspensión "${tipo.descripcion}" está desactivado.`);
  if (indiceDia(campos.fechaFin) < indiceDia(campos.fechaInicio)) {
    throw new ValidationError('La fecha de fin no puede ser anterior a la fecha de inicio.');
  }
  if (!ESTADOS.includes(campos.estado)) throw new ValidationError(`El estado debe ser uno de: ${ESTADOS.join(', ')}.`);
  if (personal.fechaIngreso && indiceDia(campos.fechaInicio) < indiceDia(personal.fechaIngreso)) {
    throw new ValidationError(`${nombreCompleto(personal)} ingresó el ${desdeIndice(indiceDia(personal.fechaIngreso)).toISOString().slice(0, 10)}: la suspensión no puede empezar antes.`);
  }

  if (campos.estado !== 'ANULADA') {
    // Un trabajador no puede tener dos suspensiones al mismo tiempo
    const posibles = await prisma.suspensionLaboral.findMany({
      where: {
        personalId: campos.personalId,
        estado: { not: 'ANULADA' },
        ...(idActual ? { id: { not: idActual } } : {}),
        fechaInicio: { lte: new Date(campos.fechaFin.getTime() + MS_DIA) },
        fechaFin: { gte: new Date(campos.fechaInicio.getTime() - MS_DIA) },
      },
      include: { tipoSuspensionLaboral: { select: { descripcion: true } } },
    });
    const cruce = posibles.find((s) => diasEnRango(s.fechaInicio, s.fechaFin, campos.fechaInicio, campos.fechaFin) > 0);
    if (cruce) {
      throw new ConflictError(
        `${nombreCompleto(personal)} ya tiene "${cruce.tipoSuspensionLaboral.descripcion}" del ${desdeIndice(indiceDia(cruce.fechaInicio)).toISOString().slice(0, 10)} al ${desdeIndice(indiceDia(cruce.fechaFin)).toISOString().slice(0, 10)}, que se cruza con estas fechas.`,
      );
    }
  }

  if (tipo.esDescansoVacacional) {
    if (!campos.periodoVacacionalId) {
      throw new ValidationError('Las vacaciones deben asignarse a un periodo vacacional: elija el periodo del que se descuentan los días.');
    }
    if (campos.estado !== 'ANULADA') {
      const { periodo, libres } = await saldoLibrePeriodo(campos.periodoVacacionalId, idActual);
      if (Number(periodo.personalId) !== Number(campos.personalId)) {
        throw new ValidationError('El periodo vacacional elegido pertenece a otro trabajador.');
      }
      if (campos.dias > libres) {
        throw new ValidationError(
          `El periodo ${periodo.numeroPeriodo} solo tiene ${Math.max(0, libres)} día(s) disponible(s) y se intentan registrar ${campos.dias}. Elija otro periodo o reduzca los días.`,
        );
      }
    }
  } else if (campos.periodoVacacionalId) {
    throw new ValidationError(`El tipo "${tipo.descripcion}" no es descanso vacacional: no debe asignarse a un periodo vacacional.`);
  }
};

const camposSuspension = (data, existente = null) => {
  const campos = {
    personalId: Number(data.personalId ?? existente?.personalId),
    tipoSuspensionLaboralId: Number(data.tipoSuspensionLaboralId ?? existente?.tipoSuspensionLaboralId),
    periodoVacacionalId:
      data.periodoVacacionalId !== undefined
        ? data.periodoVacacionalId
          ? Number(data.periodoVacacionalId)
          : null
        : existente?.periodoVacacionalId
          ? Number(existente.periodoVacacionalId)
          : null,
    fechaInicio: aFecha(data.fechaInicio ?? existente?.fechaInicio, 'La fecha de inicio'),
    fechaFin: aFecha(data.fechaFin ?? existente?.fechaFin, 'La fecha de fin'),
    estado: String(data.estado ?? existente?.estado ?? 'PROGRAMADA').toUpperCase(),
    motivoAnulacion: data.motivoAnulacion !== undefined ? data.motivoAnulacion || null : existente?.motivoAnulacion ?? null,
    observaciones: data.observaciones !== undefined ? data.observaciones || null : existente?.observaciones ?? null,
  };
  campos.dias = diasEntre(campos.fechaInicio, campos.fechaFin);
  return campos;
};

const listarSuspensiones = async (filtros = {}) => {
  try {
    const where = {};
    if (filtros.personalId) where.personalId = Number(filtros.personalId);
    if (filtros.estado) where.estado = String(filtros.estado).toUpperCase();
    if (filtros.tipoSuspensionLaboralId) where.tipoSuspensionLaboralId = Number(filtros.tipoSuspensionLaboralId);
    if (filtros.periodoVacacionalId) where.periodoVacacionalId = Number(filtros.periodoVacacionalId);
    if (filtros.empresaId) where.personal = { empresaId: Number(filtros.empresaId) };
    if (filtros.anio) {
      const anio = Number(filtros.anio);
      where.fechaInicio = { lte: new Date(Date.UTC(anio, 11, 31)) };
      where.fechaFin = { gte: new Date(Date.UTC(anio, 0, 1)) };
    }
    return await prisma.suspensionLaboral.findMany({ where, include: incluirSuspension, orderBy: [{ fechaInicio: 'desc' }, { id: 'desc' }] });
  } catch (err) {
    manejarError(err, 'listar las suspensiones');
  }
};

const obtenerSuspension = async (id) => {
  try {
    const fila = await prisma.suspensionLaboral.findUnique({ where: { id }, include: incluirSuspension });
    if (!fila) throw new NotFoundError('Suspensión no encontrada');
    return fila;
  } catch (err) {
    manejarError(err, 'obtener la suspensión');
  }
};

const crearSuspension = async (data) => {
  try {
    const campos = camposSuspension(data);
    await validarSuspension(campos);
    return await prisma.suspensionLaboral.create({ data: { ...campos, creadoPor: data.creadoPor || null }, include: incluirSuspension });
  } catch (err) {
    manejarError(err, 'crear la suspensión');
  }
};

/** Una suspensión ya contada en una planilla aprobada no debería cambiar sin revisar esa boleta: se avisa con un error claro */
const verificarSinBoleta = async (id) => {
  const usos = await prisma.planillaTrabajadorSuspension.count({ where: { suspensionLaboralId: id } });
  if (usos > 0) {
    throw new ConflictError(
      `Esta suspensión ya figura en ${usos} boleta(s) de planilla. Para corregirla, primero recalcule o elimine esas boletas; si ya no corresponde, anúlela.`,
    );
  }
};

const actualizarSuspension = async (id, data) => {
  try {
    const existente = await prisma.suspensionLaboral.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Suspensión no encontrada');
    const cambiaFechasOTipo =
      data.fechaInicio !== undefined || data.fechaFin !== undefined || data.tipoSuspensionLaboralId !== undefined || data.personalId !== undefined;
    if (cambiaFechasOTipo) await verificarSinBoleta(id);
    const campos = camposSuspension(data, existente);
    await validarSuspension(campos, id);
    return await prisma.suspensionLaboral.update({
      where: { id },
      data: { ...campos, actualizadoPor: data.actualizadoPor || null },
      include: incluirSuspension,
    });
  } catch (err) {
    manejarError(err, 'actualizar la suspensión');
  }
};

const cambiarEstadoSuspension = async (id, estado, data = {}) => {
  try {
    const existente = await prisma.suspensionLaboral.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Suspensión no encontrada');
    if (existente.estado === estado) return await obtenerSuspension(id);
    if (estado === 'ANULADA' && !String(data.motivoAnulacion || '').trim()) {
      throw new ValidationError('Indique el motivo de la anulación.');
    }
    const campos = camposSuspension({ estado, motivoAnulacion: estado === 'ANULADA' ? data.motivoAnulacion : null }, existente);
    await validarSuspension(campos, id);
    return await prisma.suspensionLaboral.update({
      where: { id },
      data: { estado: campos.estado, motivoAnulacion: campos.motivoAnulacion, actualizadoPor: data.actualizadoPor || null },
      include: incluirSuspension,
    });
  } catch (err) {
    manejarError(err, 'cambiar el estado de la suspensión');
  }
};

const eliminarSuspension = async (id) => {
  try {
    const existente = await prisma.suspensionLaboral.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Suspensión no encontrada');
    if (existente.estado !== 'PROGRAMADA') {
      throw new ConflictError('Solo se pueden eliminar suspensiones PROGRAMADAS. Si ya se ejecutó, anúlela indicando el motivo para conservar el historial.');
    }
    await verificarSinBoleta(id);
    await prisma.suspensionLaboral.delete({ where: { id } });
    return true;
  } catch (err) {
    manejarError(err, 'eliminar la suspensión');
  }
};

// ════════════════════════════════════════════════════════════
// SALDOS Y REPORTES
// ════════════════════════════════════════════════════════════

const diasBaseMes = async (fecha) => {
  const vigentes = await parametroLegalService.obtenerVigentes(fecha, null);
  const parametro = vigentes.find((p) => p.clave === 'DIAS_BASE_MES');
  return parametro ? Number(parametro.valor) : DIAS_BASE_MES_POR_DEFECTO;
};

/** Remuneración mensual y diaria de cada trabajador según su contrato de planilla vigente (el diario se valora sobre el mes comercial) */
const remuneracionesVigentes = async (personalIds, fecha, divisor) => {
  const contratos = await prisma.contratoPersonal.findMany({
    where: {
      personalId: { in: personalIds },
      activo: true,
      esLocacionServicios: false,
      fechaInicio: { lte: fecha },
      OR: [{ fechaFin: null }, { fechaFin: { gte: fecha } }],
    },
    orderBy: [{ fechaInicio: 'asc' }],
  });
  const mapa = new Map();
  for (const c of contratos) mapa.set(Number(c.personalId), c); // el más reciente queda al final
  const resultado = new Map();
  for (const [id, c] of mapa) {
    const basica = Number(c.remuneracionBasica);
    resultado.set(id, c.esJornal ? { mensual: redondear(basica * divisor), diaria: redondear(basica) } : { mensual: basica, diaria: redondear(basica / divisor) });
  }
  return resultado;
};

/**
 * Situación vacacional de cada trabajador: periodos con sus tramos, días gozados, programados y pendientes, y su valorización.
 * Es la base de todos los reportes (saldos, control vacacional, calendario, proyección).
 */
const calcularSaldos = async (filtros = {}) => {
  try {
    const hoy = new Date();
    const wherePersonal = {};
    if (filtros.empresaId) wherePersonal.empresaId = Number(filtros.empresaId);
    if (filtros.personalId) wherePersonal.id = Number(filtros.personalId);
    if (!(filtros.incluirCesados === true || filtros.incluirCesados === 'true')) wherePersonal.cesado = false;

    const personales = await prisma.personal.findMany({
      where: wherePersonal,
      select: { id: true, nombres: true, apellidos: true, numeroDocumento: true, fechaIngreso: true, cesado: true, cargoId: true, empresaId: true },
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
    });
    const ids = personales.map((p) => Number(p.id));
    if (ids.length === 0) return [];

    const [cargos, periodos, suspensiones, divisor] = await Promise.all([
      prisma.cargosPersonal.findMany({ select: { id: true, descripcion: true } }),
      prisma.periodoVacacional.findMany({ where: { personalId: { in: ids }, activo: true }, orderBy: [{ personalId: 'asc' }, { numeroPeriodo: 'asc' }] }),
      prisma.suspensionLaboral.findMany({
        where: { personalId: { in: ids }, estado: { not: 'ANULADA' } },
        include: { tipoSuspensionLaboral: { select: { id: true, codigoPlame: true, descripcion: true, esDescansoVacacional: true, conGoceRemuneracion: true } } },
        orderBy: { fechaInicio: 'asc' },
      }),
      diasBaseMes(hoy),
    ]);
    const remuneraciones = await remuneracionesVigentes(ids, hoy, divisor);
    const cargoPorId = new Map(cargos.map((c) => [Number(c.id), c.descripcion]));

    return personales.map((p) => {
      const id = Number(p.id);
      const rem = remuneraciones.get(id) || { mensual: 0, diaria: 0 };
      const susp = suspensiones.filter((s) => Number(s.personalId) === id);
      const tramosVacaciones = susp.filter((s) => s.tipoSuspensionLaboral.esDescansoVacacional);
      const periodosP = periodos
        .filter((x) => Number(x.personalId) === id)
        .map((x) => {
          const tramos = tramosVacaciones
            .filter((s) => Number(s.periodoVacacionalId) === Number(x.id))
            .map((s) => ({ id: Number(s.id), fechaInicio: s.fechaInicio, fechaFin: s.fechaFin, dias: s.dias, estado: s.estado }));
          const gozados = tramos.filter((t) => t.estado === 'EJECUTADA').reduce((a, t) => a + t.dias, 0);
          const programados = tramos.filter((t) => t.estado === 'PROGRAMADA').reduce((a, t) => a + t.dias, 0);
          const porGozar = x.diasDerecho - x.diasVendidos - gozados; // incluye lo ya programado
          let estado = 'PENDIENTE';
          if (porGozar <= 0) estado = 'COMPLETO';
          else if (indiceDia(hoy) > indiceDia(x.fechaLimiteGoce)) estado = 'VENCIDO';
          else if (gozados > 0 || programados > 0) estado = 'PARCIAL';
          return {
            id: Number(x.id),
            numeroPeriodo: x.numeroPeriodo,
            fechaInicio: x.fechaInicio,
            fechaFin: x.fechaFin,
            fechaLimiteGoce: x.fechaLimiteGoce,
            diasDerecho: x.diasDerecho,
            diasVendidos: x.diasVendidos,
            gozados,
            programados,
            pendientes: Math.max(0, porGozar),
            sinProgramar: Math.max(0, porGozar - programados),
            tramos,
            fraccionado: tramos.length > 1,
            estado,
          };
        });
      const sum = (campo) => periodosP.reduce((a, x) => a + x[campo], 0);
      const pendientes = sum('pendientes');
      let situacion = 'SIN_PERIODOS';
      if (periodosP.length > 0) {
        situacion = periodosP.some((x) => x.estado === 'VENCIDO') ? 'VENCIDA' : periodosP.some((x) => x.estado !== 'COMPLETO') ? 'PENDIENTE' : 'AL_DIA';
      }
      return {
        personalId: id,
        trabajador: nombreCompleto(p),
        numeroDocumento: p.numeroDocumento,
        cargo: p.cargoId ? cargoPorId.get(Number(p.cargoId)) || null : null,
        fechaIngreso: p.fechaIngreso,
        cesado: p.cesado,
        remuneracionMensual: rem.mensual,
        remuneracionDiaria: rem.diaria,
        periodos: periodosP,
        otrasSuspensiones: susp
          .filter((s) => !s.tipoSuspensionLaboral.esDescansoVacacional)
          .map((s) => ({ id: Number(s.id), tipo: s.tipoSuspensionLaboral.descripcion, fechaInicio: s.fechaInicio, fechaFin: s.fechaFin, dias: s.dias, estado: s.estado })),
        totales: {
          derecho: sum('diasDerecho'),
          vendidos: sum('diasVendidos'),
          gozados: sum('gozados'),
          programados: sum('programados'),
          pendientes,
          monetizacionGozada: redondear(sum('gozados') * rem.diaria),
          monetizacionPendiente: redondear(pendientes * rem.diaria),
        },
        situacion,
      };
    });
  } catch (err) {
    manejarError(err, 'calcular los saldos de vacaciones');
  }
};

/** Estadísticas generales: quiénes están al día, con pendientes o vencidos, y cuánto cuesta lo pendiente */
const resumenEstadistico = async (filtros = {}) => {
  const saldos = await calcularSaldos(filtros);
  const cuenta = (situacion) => saldos.filter((s) => s.situacion === situacion).length;
  const periodos = saldos.flatMap((s) => s.periodos);
  const gozadosPeriodos = periodos.filter((p) => p.tramos.some((t) => t.estado === 'EJECUTADA'));
  return {
    trabajadores: saldos.length,
    alDia: cuenta('AL_DIA'),
    conPendientes: cuenta('PENDIENTE'),
    vencidas: cuenta('VENCIDA'),
    sinPeriodos: cuenta('SIN_PERIODOS'),
    diasPendientes: saldos.reduce((a, s) => a + s.totales.pendientes, 0),
    diasProgramados: saldos.reduce((a, s) => a + s.totales.programados, 0),
    costoPendiente: redondear(saldos.reduce((a, s) => a + s.totales.monetizacionPendiente, 0)),
    periodosCompletos: periodos.filter((p) => p.estado === 'COMPLETO').length,
    periodosVencidos: periodos.filter((p) => p.estado === 'VENCIDO').length,
    periodosCompletosEnUnSoloTramo: gozadosPeriodos.filter((p) => p.estado === 'COMPLETO' && p.tramos.length === 1).length,
    periodosFraccionados: periodos.filter((p) => p.fraccionado).length,
    trabajadoresConMasPendientes: [...saldos]
      .sort((a, b) => b.totales.pendientes - a.totales.pendientes)
      .slice(0, 10)
      .map((s) => ({ personalId: s.personalId, trabajador: s.trabajador, pendientes: s.totales.pendientes, situacion: s.situacion })),
  };
};

/** Calendario anual: los tramos de cada trabajador recortados al año, con sus totales y valorización (equivale a la hoja EJECUTADO) */
const calendarioAnual = async (filtros = {}) => {
  const anio = Number(filtros.anio) || new Date().getFullYear();
  const desde = Date.UTC(anio, 0, 1);
  const hasta = Date.UTC(anio, 11, 31);
  const saldos = await calcularSaldos(filtros);
  return {
    anio,
    trabajadores: saldos.map((s) => {
      const vacaciones = s.periodos.flatMap((p) => p.tramos.map((t) => ({ ...t, tipo: 'VACACIONES' })));
      const otras = s.otrasSuspensiones.map((o) => ({ ...o, tipo: o.tipo }));
      const tramos = [...vacaciones, ...otras]
        .map((t) => ({ ...t, diasEnAnio: diasEnRango(t.fechaInicio, t.fechaFin, desde, hasta) }))
        .filter((t) => t.diasEnAnio > 0)
        .sort((a, b) => indiceDia(a.fechaInicio) - indiceDia(b.fechaInicio));
      const gozadosAnio = vacaciones
        .filter((t) => t.estado === 'EJECUTADA')
        .reduce((a, t) => a + diasEnRango(t.fechaInicio, t.fechaFin, desde, hasta), 0);
      const programadosAnio = vacaciones
        .filter((t) => t.estado === 'PROGRAMADA')
        .reduce((a, t) => a + diasEnRango(t.fechaInicio, t.fechaFin, desde, hasta), 0);
      return {
        personalId: s.personalId,
        trabajador: s.trabajador,
        cargo: s.cargo,
        fechaIngreso: s.fechaIngreso,
        remuneracionMensual: s.remuneracionMensual,
        remuneracionDiaria: s.remuneracionDiaria,
        tramos,
        diasGozados: gozadosAnio,
        diasProgramados: programadosAnio,
        monetizacionGozadas: redondear(gozadosAnio * s.remuneracionDiaria),
        diasPendientes: s.totales.pendientes,
        monetizacionPendientes: s.totales.monetizacionPendiente,
      };
    }),
  };
};

/** Proyección a una fecha de corte (equivale a la hoja PROYECCION): pendientes al corte, lo programado después y lo que queda (puede ser negativo) */
const proyeccion = async (filtros = {}) => {
  const corte = filtros.fechaCorte ? aFecha(filtros.fechaCorte, 'La fecha de corte') : new Date();
  const saldos = await calcularSaldos(filtros);
  const idxCorte = indiceDia(corte);
  return {
    fechaCorte: corte,
    trabajadores: saldos.map((s) => {
      const periodosAlCorte = s.periodos.filter((p) => indiceDia(p.fechaFin) <= idxCorte);
      const derecho = periodosAlCorte.reduce((a, p) => a + p.diasDerecho - p.diasVendidos, 0);
      const tramos = periodosAlCorte.flatMap((p) => p.tramos);
      const gozadosAlCorte = tramos.reduce((a, t) => a + diasEnRango(t.fechaInicio, t.fechaFin, 0, corte), 0);
      const programadosDespues = s.periodos
        .flatMap((p) => p.tramos)
        .reduce((a, t) => a + diasEnRango(t.fechaInicio, t.fechaFin, desdeIndice(idxCorte + 1), new Date(Date.UTC(9999, 0, 1))), 0);
      const pendientesAlCorte = Math.max(0, derecho - gozadosAlCorte);
      const pendientesFinales = pendientesAlCorte - programadosDespues;
      return {
        personalId: s.personalId,
        trabajador: s.trabajador,
        cargo: s.cargo,
        fechaIngreso: s.fechaIngreso,
        remuneracionMensual: s.remuneracionMensual,
        remuneracionDiaria: s.remuneracionDiaria,
        pendientesAlCorte,
        programadosDespues,
        pendientesFinales,
        monetizacion: redondear(pendientesFinales * s.remuneracionDiaria),
      };
    }),
  };
};

/** Vacaciones por mes del año: días y cantidad de trabajadores, por estado */
const vacacionesPorMes = async (filtros = {}) => {
  const anio = Number(filtros.anio) || new Date().getFullYear();
  const saldos = await calcularSaldos(filtros);
  const meses = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, diasEjecutados: 0, diasProgramados: 0, trabajadores: new Set() }));
  for (const s of saldos) {
    for (const t of s.periodos.flatMap((p) => p.tramos)) {
      for (let m = 0; m < 12; m++) {
        const dias = diasEnRango(t.fechaInicio, t.fechaFin, Date.UTC(anio, m, 1), Date.UTC(anio, m + 1, 0));
        if (dias === 0) continue;
        if (t.estado === 'EJECUTADA') meses[m].diasEjecutados += dias;
        else meses[m].diasProgramados += dias;
        meses[m].trabajadores.add(s.personalId);
      }
    }
  }
  return { anio, meses: meses.map((m) => ({ mes: m.mes, diasEjecutados: m.diasEjecutados, diasProgramados: m.diasProgramados, trabajadores: m.trabajadores.size })) };
};

/**
 * Suspensiones que caen dentro de un periodo de planilla, por trabajador (las usa el motor de planilla).
 * Cada elemento trae los días recortados al periodo y los indicadores del tipo.
 */
const suspensionesEnPeriodo = async (db, personalIds, fechaInicio, fechaFin) => {
  const filas = await db.suspensionLaboral.findMany({
    where: {
      personalId: { in: personalIds },
      estado: { not: 'ANULADA' },
      fechaInicio: { lte: new Date(new Date(fechaFin).getTime() + MS_DIA) },
      fechaFin: { gte: new Date(new Date(fechaInicio).getTime() - MS_DIA) },
    },
    include: { tipoSuspensionLaboral: true },
    orderBy: { fechaInicio: 'asc' },
  });
  const porPersonal = new Map();
  for (const s of filas) {
    const dias = diasEnRango(s.fechaInicio, s.fechaFin, fechaInicio, fechaFin);
    if (dias === 0) continue;
    const id = Number(s.personalId);
    if (!porPersonal.has(id)) porPersonal.set(id, []);
    porPersonal.get(id).push({
      suspensionLaboralId: Number(s.id),
      tipoSuspensionLaboralId: Number(s.tipoSuspensionLaboralId),
      tipo: s.tipoSuspensionLaboral,
      fechaInicio: desdeIndice(Math.max(indiceDia(s.fechaInicio), indiceDia(fechaInicio))),
      fechaFin: desdeIndice(Math.min(indiceDia(s.fechaFin), indiceDia(fechaFin))),
      dias,
    });
  }
  return porPersonal;
};

export default {
  listarTipos,
  crearTipo,
  actualizarTipo,
  eliminarTipo,
  generarPeriodos,
  generarPeriodosEmpresa,
  actualizarPeriodo,
  listarSuspensiones,
  obtenerSuspension,
  crearSuspension,
  actualizarSuspension,
  cambiarEstadoSuspension,
  eliminarSuspension,
  calcularSaldos,
  resumenEstadistico,
  calendarioAnual,
  proyeccion,
  vacacionesPorMes,
  suspensionesEnPeriodo,
};
