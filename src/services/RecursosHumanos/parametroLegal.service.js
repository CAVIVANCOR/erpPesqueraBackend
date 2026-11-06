import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';
import { normalizarTexto } from '../../utils/texto.util.js';

/**
 * Servicio de ParametroLegal: parámetros legales (UIT, RMV, % EsSalud...) y reglas por régimen
 * (días de vacaciones, tope de CTS...) con vigencia.
 *
 * Reglas (decisión del propietario): los datos se ingresan válidos y quedan activos desde el primer momento.
 * Al crear un parámetro nuevo, el anterior de la misma clave y régimen se cierra el día previo a la nueva vigencia.
 * La planilla guarda los montos ya calculados, por eso editar o eliminar un parámetro no altera boletas pasadas.
 * La validación del contador es solo informativa.
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
  regimenLaboral: { select: { id: true, codigoSunat: true, descripcion: true } },
};

const aFecha = (valor, etiqueta) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) throw new ValidationError(`${etiqueta} no es una fecha válida.`);
  return fecha;
};

const aIdOpcional = (valor) => (valor === null || valor === '' || valor === undefined ? null : Number(valor));

const camposEditables = (data) => {
  const campos = {};
  if (data.regimenLaboralId !== undefined) campos.regimenLaboralId = aIdOpcional(data.regimenLaboralId);
  if (data.clave !== undefined) campos.clave = String(data.clave).trim().toUpperCase();
  if (data.descripcion !== undefined) campos.descripcion = normalizarTexto(data.descripcion);
  if (data.valor !== undefined && data.valor !== null && data.valor !== '') campos.valor = Number(data.valor);
  if (data.vigenteDesde !== undefined) campos.vigenteDesde = aFecha(data.vigenteDesde, 'La fecha de inicio de vigencia');
  if (data.vigenteHasta !== undefined) {
    campos.vigenteHasta = data.vigenteHasta ? aFecha(data.vigenteHasta, 'La fecha de fin de vigencia') : null;
  }
  if (data.validadoPorContador !== undefined) campos.validadoPorContador = Boolean(data.validadoPorContador);
  return campos;
};

async function validar(campos, id = null, actual = null) {
  if (campos.clave !== undefined) {
    if (!campos.clave) throw new ValidationError('La clave del parámetro es obligatoria.');
    if (!/^[A-Z0-9_]+$/.test(campos.clave)) {
      throw new ValidationError('La clave solo admite letras mayúsculas, números y guion bajo (ej. UIT, VACACIONES_DIAS).');
    }
    if (campos.clave.length > 80) throw new ValidationError('La clave no puede exceder 80 caracteres.');
  }
  if (campos.descripcion !== undefined) {
    if (!campos.descripcion) throw new ValidationError('La descripción del parámetro es obligatoria.');
    if (campos.descripcion.length > 150) throw new ValidationError('La descripción no puede exceder 150 caracteres.');
  }
  if (campos.valor !== undefined && Number.isNaN(campos.valor)) {
    throw new ValidationError('El valor del parámetro debe ser numérico.');
  }
  const desde = campos.vigenteDesde ?? actual?.vigenteDesde;
  const hasta = campos.vigenteHasta !== undefined ? campos.vigenteHasta : actual?.vigenteHasta;
  if (desde && hasta && hasta < desde) {
    throw new ValidationError('La fecha de fin de vigencia no puede ser anterior a la de inicio.');
  }
  if (campos.regimenLaboralId) {
    const regimen = await prisma.regimenLaboral.findUnique({ where: { id: campos.regimenLaboralId } });
    if (!regimen) throw new ValidationError('El régimen laboral indicado no existe.');
  }
  // Unicidad por clave + régimen + inicio de vigencia (con régimen vacío la base no la garantiza)
  const clave = campos.clave ?? actual?.clave;
  const regimenLaboralId = campos.regimenLaboralId !== undefined ? campos.regimenLaboralId : actual?.regimenLaboralId ?? null;
  if (clave && desde) {
    const duplicado = await prisma.parametroLegal.findFirst({
      where: { clave, regimenLaboralId, vigenteDesde: desde, ...(id && { id: { not: id } }) },
    });
    if (duplicado) {
      throw new ConflictError(`Ya existe el parámetro ${clave} con vigencia desde esa fecha para el mismo régimen.`);
    }
  }
}

const listar = async (filtros = {}) => {
  try {
    const where = {};
    if (filtros.regimenLaboralId === 'general') where.regimenLaboralId = null;
    else if (filtros.regimenLaboralId) where.regimenLaboralId = Number(filtros.regimenLaboralId);
    if (filtros.clave) where.clave = { contains: String(filtros.clave).toUpperCase() };
    if (filtros.activo !== undefined && filtros.activo !== '') where.activo = filtros.activo === 'true' || filtros.activo === true;
    return await prisma.parametroLegal.findMany({
      where,
      include: incluirRelaciones,
      orderBy: [{ clave: 'asc' }, { vigenteDesde: 'desc' }],
    });
  } catch (err) {
    manejarError(err, 'listar los parámetros legales');
  }
};

/**
 * Valores vigentes a una fecha: solo parámetros ACTIVOS. Si una clave existe para el régimen pedido y también
 * como general, prevalece el del régimen. Es la consulta que usará el cálculo de la planilla.
 */
const obtenerVigentes = async (fecha, regimenLaboralId) => {
  try {
    const referencia = fecha ? aFecha(fecha, 'La fecha de consulta') : new Date();
    const regimenId = aIdOpcional(regimenLaboralId);
    const filas = await prisma.parametroLegal.findMany({
      where: {
        activo: true,
        vigenteDesde: { lte: referencia },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: referencia } }],
        AND: [{ OR: [{ regimenLaboralId: null }, ...(regimenId ? [{ regimenLaboralId: regimenId }] : [])] }],
      },
      include: incluirRelaciones,
      orderBy: { vigenteDesde: 'desc' },
    });
    const porClave = new Map();
    for (const fila of filas) {
      const actual = porClave.get(fila.clave);
      const esDelRegimen = fila.regimenLaboralId !== null;
      if (!actual || (esDelRegimen && actual.regimenLaboralId === null)) porClave.set(fila.clave, fila);
    }
    return [...porClave.values()].sort((a, b) => a.clave.localeCompare(b.clave));
  } catch (err) {
    manejarError(err, 'obtener los parámetros legales vigentes');
  }
};

const obtenerPorId = async (id) => {
  try {
    const parametro = await prisma.parametroLegal.findUnique({ where: { id }, include: incluirRelaciones });
    if (!parametro) throw new NotFoundError('Parámetro legal no encontrado');
    return parametro;
  } catch (err) {
    manejarError(err, 'obtener el parámetro legal');
  }
};

const crear = async (data) => {
  try {
    const campos = camposEditables(data);
    if (campos.clave === undefined) throw new ValidationError('La clave del parámetro es obligatoria.');
    if (campos.descripcion === undefined) throw new ValidationError('La descripción del parámetro es obligatoria.');
    if (campos.valor === undefined) throw new ValidationError('El valor del parámetro es obligatorio.');
    if (!campos.vigenteDesde) throw new ValidationError('La fecha de inicio de vigencia es obligatoria.');
    await validar(campos);
    return await prisma.$transaction(async (tx) => {
      // Cierra el parámetro anterior de la misma clave y régimen el día previo a la nueva vigencia
      const anterior = await tx.parametroLegal.findFirst({
        where: {
          clave: campos.clave,
          regimenLaboralId: campos.regimenLaboralId ?? null,
          activo: true,
          vigenteDesde: { lt: campos.vigenteDesde },
          OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: campos.vigenteDesde } }],
        },
        orderBy: { vigenteDesde: 'desc' },
      });
      if (anterior) {
        await tx.parametroLegal.update({
          where: { id: anterior.id },
          data: { vigenteHasta: new Date(campos.vigenteDesde.getTime() - MS_DIA), actualizadoPor: data.creadoPor || null },
        });
      }
      return await tx.parametroLegal.create({
        data: { ...campos, activo: true, creadoPor: data.creadoPor || null },
        include: incluirRelaciones,
      });
    });
  } catch (err) {
    manejarError(err, 'crear el parámetro legal');
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.parametroLegal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Parámetro legal no encontrado');
    const campos = camposEditables(data);
    await validar(campos, id, existente);
    return await prisma.parametroLegal.update({
      where: { id },
      data: { ...campos, actualizadoPor: data.actualizadoPor || null },
      include: incluirRelaciones,
    });
  } catch (err) {
    manejarError(err, 'actualizar el parámetro legal');
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.parametroLegal.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Parámetro legal no encontrado');
    await prisma.parametroLegal.delete({ where: { id } });
    return true;
  } catch (err) {
    manejarError(err, 'eliminar el parámetro legal');
  }
};

export default { listar, obtenerVigentes, obtenerPorId, crear, actualizar, eliminar };
