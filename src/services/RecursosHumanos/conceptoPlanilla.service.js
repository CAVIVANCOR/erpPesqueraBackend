import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio de ConceptoPlanilla (el corazón del módulo): todo ingreso, descuento, aporte o provisión es una fila.
 *
 * Reglas (decisión del propietario):
 *  - Los datos se ingresan válidos y quedan activos desde el primer momento.
 *  - Al crear un concepto nuevo, el anterior del mismo código se cierra el día previo a la nueva vigencia.
 *  - La planilla guarda los montos ya calculados, por eso editar un concepto no altera boletas pasadas.
 *  - Naturaleza: ingreso = descuento, aporte del empleador y provisión en no (como máximo uno en sí).
 *  - Cálculo: se usa UNA sola forma entre rutina del sistema, fórmula o valor manual.
 */

const MS_DIA = 24 * 60 * 60 * 1000;

const manejarError = (err, contexto) => {
  if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
  if (err.code && String(err.code).startsWith('P')) {
    throw new DatabaseError(`Error de base de datos al ${contexto}`, err.message);
  }
  throw err;
};

const incluirRelaciones = {
  tipoDeuda: { select: { id: true, nombre: true } },
  cuentas: {
    include: {
      cuentaGasto: { select: { id: true, codigoCuenta: true, nombreCuenta: true } },
      cuentaPasivo: { select: { id: true, codigoCuenta: true, nombreCuenta: true } },
    },
    orderBy: [{ esPescador: 'asc' }, { esObrero: 'asc' }],
  },
};

const BOOLEANOS = [
  'esDescuento', 'esAporteEmpleador', 'esProvision', 'esManual',
  'afectaAfpOnp', 'afectaEssalud', 'afectaQuintaCategoria', 'afectaSctr',
  'cuentaParaGratificacion', 'cuentaParaCts', 'cuentaParaVacaciones',
  'esRecurrente', 'pasivoEsDelTrabajador', 'visibleEnBoleta', 'esDelSistema',
];

const textoOpcional = (valor) => (valor === null || valor === undefined || String(valor).trim() === '' ? null : String(valor).trim());
const aIdOpcional = (valor) => (valor === null || valor === '' || valor === undefined ? null : Number(valor));
const aFecha = (valor, etiqueta) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) throw new ValidationError(`${etiqueta} no es una fecha válida.`);
  return fecha;
};

const camposEditables = (data) => {
  const campos = {};
  if (data.codigo !== undefined) campos.codigo = String(data.codigo).trim().toUpperCase();
  if (data.descripcion !== undefined) campos.descripcion = String(data.descripcion).trim();
  for (const campo of BOOLEANOS) {
    if (data[campo] !== undefined) campos[campo] = Boolean(data[campo]);
  }
  if (data.claveMotor !== undefined) campos.claveMotor = textoOpcional(data.claveMotor);
  if (data.formula !== undefined) campos.formula = textoOpcional(data.formula);
  if (data.condicionAplica !== undefined) campos.condicionAplica = textoOpcional(data.condicionAplica);
  if (data.origen !== undefined) campos.origen = String(data.origen).trim().toUpperCase();
  if (data.codigoPlame !== undefined) campos.codigoPlame = textoOpcional(data.codigoPlame);
  if (data.tipoDeudaId !== undefined) campos.tipoDeudaId = aIdOpcional(data.tipoDeudaId);
  if (data.orden !== undefined) campos.orden = Number(data.orden) || 0;
  if (data.vigenteDesde !== undefined) campos.vigenteDesde = aFecha(data.vigenteDesde, 'La fecha de inicio de vigencia');
  if (data.vigenteHasta !== undefined) {
    campos.vigenteHasta = data.vigenteHasta ? aFecha(data.vigenteHasta, 'La fecha de fin de vigencia') : null;
  }
  return campos;
};

/** Normaliza y valida las cuentas por categoría: máximo una fila por combinación empleado, obrero o pescador. */
async function normalizarCuentas(cuentas = []) {
  const vistas = new Set();
  const normalizadas = cuentas
    .map((cuenta) => ({
      esPescador: Boolean(cuenta.esPescador),
      // pescador prevalece sobre obrero: la combinación se guarda con esObrero en false
      esObrero: cuenta.esPescador ? false : Boolean(cuenta.esObrero),
      cuentaGastoId: aIdOpcional(cuenta.cuentaGastoId),
      cuentaPasivoId: aIdOpcional(cuenta.cuentaPasivoId),
    }))
    .filter((cuenta) => cuenta.cuentaGastoId || cuenta.cuentaPasivoId);

  for (const cuenta of normalizadas) {
    const clave = `${cuenta.esPescador}-${cuenta.esObrero}`;
    if (vistas.has(clave)) {
      throw new ValidationError('Hay dos filas de cuentas para la misma categoría (empleado, obrero o pescador).');
    }
    vistas.add(clave);
  }
  const ids = [...new Set(normalizadas.flatMap((c) => [c.cuentaGastoId, c.cuentaPasivoId]).filter(Boolean))];
  if (ids.length > 0) {
    const existentes = await prisma.planCuentasContable.findMany({ where: { id: { in: ids } }, select: { id: true } });
    if (existentes.length !== ids.length) {
      throw new ValidationError('Alguna de las cuentas contables indicadas no existe en el plan de cuentas.');
    }
  }
  return normalizadas;
}

async function validar(campos, id = null, actual = null) {
  const codigo = campos.codigo ?? actual?.codigo;
  const vigenteDesde = campos.vigenteDesde ?? actual?.vigenteDesde;
  const vigenteHasta = campos.vigenteHasta !== undefined ? campos.vigenteHasta : actual?.vigenteHasta ?? null;

  if (campos.codigo !== undefined) {
    if (!campos.codigo) throw new ValidationError('El código del concepto es obligatorio.');
    if (!/^[A-Z0-9_]+$/.test(campos.codigo)) {
      throw new ValidationError('El código solo admite letras mayúsculas, números y guion bajo (ej. SUELDO, AFP_APORTE).');
    }
    if (campos.codigo.length > 30) throw new ValidationError('El código no puede exceder 30 caracteres.');
  }
  if (campos.descripcion !== undefined) {
    if (!campos.descripcion) throw new ValidationError('La descripción del concepto es obligatoria.');
    if (campos.descripcion.length > 150) throw new ValidationError('La descripción no puede exceder 150 caracteres.');
  }
  if (vigenteDesde && vigenteHasta && vigenteHasta < vigenteDesde) {
    throw new ValidationError('La fecha de fin de vigencia no puede ser anterior a la de inicio.');
  }

  // Naturaleza: como máximo una marca en sí (ninguna = ingreso)
  const naturaleza = ['esDescuento', 'esAporteEmpleador', 'esProvision'].filter((c) => campos[c] ?? actual?.[c]);
  if (naturaleza.length > 1) {
    throw new ValidationError('Un concepto solo puede ser descuento, aporte del empleador o provisión (o ninguno, si es ingreso).');
  }
  // Cálculo: una sola forma
  const formas = [
    campos.claveMotor !== undefined ? campos.claveMotor : actual?.claveMotor,
    campos.formula !== undefined ? campos.formula : actual?.formula,
    (campos.esManual ?? actual?.esManual) ? 'manual' : null,
  ].filter(Boolean);
  if (formas.length !== 1) {
    throw new ValidationError('El concepto debe calcularse de UNA sola forma: rutina del sistema, fórmula o valor manual.');
  }
  if (campos.origen !== undefined && !['CONTRATO', 'PLANILLA', 'ASISTENCIA', 'PESCA', 'PRESTAMO', 'MANUAL'].includes(campos.origen)) {
    throw new ValidationError('El origen debe ser CONTRATO, PLANILLA, ASISTENCIA, PESCA, PRESTAMO o MANUAL.');
  }
  if (campos.codigoPlame && campos.codigoPlame.length > 10) {
    throw new ValidationError('El código PLAME no puede exceder 10 caracteres.');
  }
  if (campos.tipoDeudaId) {
    const tipoDeuda = await prisma.tipoDeudaPersonal.findUnique({ where: { id: campos.tipoDeudaId } });
    if (!tipoDeuda) throw new ValidationError('El tipo de deuda con personal indicado no existe.');
  }
  if (codigo && vigenteDesde) {
    const duplicado = await prisma.conceptoPlanilla.findFirst({
      where: { codigo, vigenteDesde, ...(id && { id: { not: id } }) },
    });
    if (duplicado) throw new ConflictError(`Ya existe el concepto ${codigo} con vigencia desde esa fecha.`);
  }
}

const listar = async (filtros = {}) => {
  try {
    const where = {};
    if (filtros.activo !== undefined && filtros.activo !== '') where.activo = filtros.activo === 'true' || filtros.activo === true;
    if (filtros.naturaleza === 'descuento') where.esDescuento = true;
    if (filtros.naturaleza === 'aporte') where.esAporteEmpleador = true;
    if (filtros.naturaleza === 'provision') where.esProvision = true;
    if (filtros.naturaleza === 'ingreso') Object.assign(where, { esDescuento: false, esAporteEmpleador: false, esProvision: false });
    return await prisma.conceptoPlanilla.findMany({
      where,
      include: incluirRelaciones,
      orderBy: [{ orden: 'asc' }, { codigo: 'asc' }, { vigenteDesde: 'desc' }],
    });
  } catch (err) {
    manejarError(err, 'listar los conceptos de planilla');
  }
};

const obtenerPorId = async (id) => {
  try {
    const concepto = await prisma.conceptoPlanilla.findUnique({ where: { id }, include: incluirRelaciones });
    if (!concepto) throw new NotFoundError('Concepto de planilla no encontrado');
    return concepto;
  } catch (err) {
    manejarError(err, 'obtener el concepto de planilla');
  }
};

const crear = async (data) => {
  try {
    const campos = camposEditables(data);
    if (campos.codigo === undefined) throw new ValidationError('El código del concepto es obligatorio.');
    if (campos.descripcion === undefined) throw new ValidationError('La descripción del concepto es obligatoria.');
    if (!campos.vigenteDesde) throw new ValidationError('La fecha de inicio de vigencia es obligatoria.');
    await validar(campos);
    const cuentas = await normalizarCuentas(data.cuentas);
    return await prisma.$transaction(async (tx) => {
      // Cierra el concepto anterior del mismo código el día previo a la nueva vigencia
      const anterior = await tx.conceptoPlanilla.findFirst({
        where: {
          codigo: campos.codigo,
          activo: true,
          vigenteDesde: { lt: campos.vigenteDesde },
          OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: campos.vigenteDesde } }],
        },
        orderBy: { vigenteDesde: 'desc' },
      });
      if (anterior) {
        await tx.conceptoPlanilla.update({
          where: { id: anterior.id },
          data: { vigenteHasta: new Date(campos.vigenteDesde.getTime() - MS_DIA), actualizadoPor: data.creadoPor || null },
        });
      }
      return await tx.conceptoPlanilla.create({
        data: { ...campos, activo: true, creadoPor: data.creadoPor || null, cuentas: { create: cuentas } },
        include: incluirRelaciones,
      });
    });
  } catch (err) {
    manejarError(err, 'crear el concepto de planilla');
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.conceptoPlanilla.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Concepto de planilla no encontrado');
    const campos = camposEditables(data);
    const cuentas = data.cuentas !== undefined ? await normalizarCuentas(data.cuentas) : null;
    await validar(campos, id, existente);

    return await prisma.$transaction(async (tx) => {
      if (cuentas) {
        await tx.conceptoPlanillaCuenta.deleteMany({ where: { conceptoPlanillaId: id } });
        await tx.conceptoPlanillaCuenta.createMany({ data: cuentas.map((cuenta) => ({ ...cuenta, conceptoPlanillaId: id })) });
      }
      return await tx.conceptoPlanilla.update({
        where: { id },
        data: { ...campos, actualizadoPor: data.actualizadoPor || null },
        include: incluirRelaciones,
      });
    });
  } catch (err) {
    manejarError(err, 'actualizar el concepto de planilla');
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.conceptoPlanilla.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Concepto de planilla no encontrado');
    if (existente.esDelSistema) {
      throw new ConflictError(`El concepto ${existente.codigo} es del sistema y no se elimina.`);
    }
    await prisma.conceptoPlanilla.delete({ where: { id } });
    return true;
  } catch (err) {
    manejarError(err, 'eliminar el concepto de planilla');
  }
};

export default { listar, obtenerPorId, crear, actualizar, eliminar };
