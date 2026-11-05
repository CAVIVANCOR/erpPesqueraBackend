import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio de PlantillaFormatoExterno: define el diseño de los archivos oficiales (PLAME, AFPnet).
 * Si SUNAT o AFPnet cambian el formato, se agrega una plantilla nueva con vigencia, sin tocar el programa.
 *
 * Se ingresa válida y queda activa de inmediato; al crear una nueva, la anterior del mismo código se cierra el
 * día previo a la nueva vigencia.
 */

const MS_DIA = 24 * 60 * 60 * 1000;

const manejarError = (err, contexto) => {
  if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
  if (err.code && String(err.code).startsWith('P')) {
    throw new DatabaseError(`Error de base de datos al ${contexto}`, err.message);
  }
  throw err;
};

const aFecha = (valor, etiqueta) => {
  const fecha = new Date(valor);
  if (Number.isNaN(fecha.getTime())) throw new ValidationError(`${etiqueta} no es una fecha válida.`);
  return fecha;
};

/** La definición puede llegar como objeto o como texto JSON (editor de la pantalla). */
const aDefinicion = (valor) => {
  if (valor === null || valor === undefined || valor === '') throw new ValidationError('La definición del formato es obligatoria.');
  if (typeof valor !== 'string') return valor;
  try {
    return JSON.parse(valor);
  } catch (err) {
    throw new ValidationError(`La definición del formato no es un JSON válido: ${err.message}`);
  }
};

const camposEditables = (data) => {
  const campos = {};
  if (data.codigo !== undefined) campos.codigo = String(data.codigo).trim().toUpperCase();
  if (data.descripcion !== undefined) campos.descripcion = String(data.descripcion).trim();
  if (data.definicion !== undefined) campos.definicion = aDefinicion(data.definicion);
  if (data.vigenteDesde !== undefined) campos.vigenteDesde = aFecha(data.vigenteDesde, 'La fecha de inicio de vigencia');
  if (data.vigenteHasta !== undefined) {
    campos.vigenteHasta = data.vigenteHasta ? aFecha(data.vigenteHasta, 'La fecha de fin de vigencia') : null;
  }
  return campos;
};

async function validar(campos, id = null, actual = null) {
  if (campos.codigo !== undefined) {
    if (!campos.codigo) throw new ValidationError('El código del formato es obligatorio.');
    if (!/^[A-Z0-9_]+$/.test(campos.codigo)) {
      throw new ValidationError('El código solo admite letras mayúsculas, números y guion bajo (ej. AFPNET_PLANILLA).');
    }
    if (campos.codigo.length > 40) throw new ValidationError('El código no puede exceder 40 caracteres.');
  }
  if (campos.descripcion !== undefined) {
    if (!campos.descripcion) throw new ValidationError('La descripción del formato es obligatoria.');
    if (campos.descripcion.length > 150) throw new ValidationError('La descripción no puede exceder 150 caracteres.');
  }
  const codigo = campos.codigo ?? actual?.codigo;
  const desde = campos.vigenteDesde ?? actual?.vigenteDesde;
  const hasta = campos.vigenteHasta !== undefined ? campos.vigenteHasta : actual?.vigenteHasta ?? null;
  if (desde && hasta && hasta < desde) {
    throw new ValidationError('La fecha de fin de vigencia no puede ser anterior a la de inicio.');
  }
  if (codigo && desde) {
    const duplicada = await prisma.plantillaFormatoExterno.findFirst({
      where: { codigo, vigenteDesde: desde, ...(id && { id: { not: id } }) },
    });
    if (duplicada) throw new ConflictError(`Ya existe una plantilla ${codigo} con vigencia desde esa fecha.`);
  }
}

const listar = async (filtros = {}) => {
  try {
    const where = {};
    if (filtros.codigo) where.codigo = String(filtros.codigo).toUpperCase();
    if (filtros.activo !== undefined && filtros.activo !== '') where.activo = filtros.activo === 'true' || filtros.activo === true;
    return await prisma.plantillaFormatoExterno.findMany({ where, orderBy: [{ codigo: 'asc' }, { vigenteDesde: 'desc' }] });
  } catch (err) {
    manejarError(err, 'listar las plantillas de formato externo');
  }
};

/** Plantilla ACTIVA vigente a una fecha para un código (la que usará el generador de archivos). */
const obtenerVigente = async (codigo, fecha) => {
  try {
    if (!codigo) throw new ValidationError('Indique el código del formato a consultar.');
    const referencia = fecha ? aFecha(fecha, 'La fecha de consulta') : new Date();
    const plantilla = await prisma.plantillaFormatoExterno.findFirst({
      where: {
        codigo: String(codigo).toUpperCase(),
        activo: true,
        vigenteDesde: { lte: referencia },
        OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: referencia } }],
      },
      orderBy: { vigenteDesde: 'desc' },
    });
    if (!plantilla) throw new NotFoundError(`No hay una plantilla activa vigente para el formato ${String(codigo).toUpperCase()}.`);
    return plantilla;
  } catch (err) {
    manejarError(err, 'obtener la plantilla vigente');
  }
};

const obtenerPorId = async (id) => {
  try {
    const plantilla = await prisma.plantillaFormatoExterno.findUnique({ where: { id } });
    if (!plantilla) throw new NotFoundError('Plantilla de formato externo no encontrada');
    return plantilla;
  } catch (err) {
    manejarError(err, 'obtener la plantilla de formato externo');
  }
};

const crear = async (data) => {
  try {
    const campos = camposEditables(data);
    if (campos.codigo === undefined) throw new ValidationError('El código del formato es obligatorio.');
    if (campos.descripcion === undefined) throw new ValidationError('La descripción del formato es obligatoria.');
    if (campos.definicion === undefined) throw new ValidationError('La definición del formato es obligatoria.');
    if (!campos.vigenteDesde) throw new ValidationError('La fecha de inicio de vigencia es obligatoria.');
    await validar(campos);
    return await prisma.$transaction(async (tx) => {
      // Cierra la plantilla anterior del mismo código el día previo a la nueva vigencia
      const anterior = await tx.plantillaFormatoExterno.findFirst({
        where: {
          codigo: campos.codigo,
          activo: true,
          vigenteDesde: { lt: campos.vigenteDesde },
          OR: [{ vigenteHasta: null }, { vigenteHasta: { gte: campos.vigenteDesde } }],
        },
        orderBy: { vigenteDesde: 'desc' },
      });
      if (anterior) {
        await tx.plantillaFormatoExterno.update({
          where: { id: anterior.id },
          data: { vigenteHasta: new Date(campos.vigenteDesde.getTime() - MS_DIA), actualizadoPor: data.creadoPor || null },
        });
      }
      return await tx.plantillaFormatoExterno.create({ data: { ...campos, activo: true, creadoPor: data.creadoPor || null } });
    });
  } catch (err) {
    manejarError(err, 'crear la plantilla de formato externo');
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.plantillaFormatoExterno.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Plantilla de formato externo no encontrada');
    const campos = camposEditables(data);
    await validar(campos, id, existente);
    return await prisma.plantillaFormatoExterno.update({
      where: { id },
      data: { ...campos, actualizadoPor: data.actualizadoPor || null },
    });
  } catch (err) {
    manejarError(err, 'actualizar la plantilla de formato externo');
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.plantillaFormatoExterno.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Plantilla de formato externo no encontrada');
    await prisma.plantillaFormatoExterno.delete({ where: { id } });
    return true;
  } catch (err) {
    manejarError(err, 'eliminar la plantilla de formato externo');
  }
};

export default { listar, obtenerVigente, obtenerPorId, crear, actualizar, eliminar };
