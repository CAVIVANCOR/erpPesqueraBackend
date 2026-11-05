import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD de RegimenLaboral (General 01, Microempresa 16, Pequeña empresa 17).
 * Solo identifica el régimen: sus reglas viven en ParametroLegal, con vigencia.
 */

const manejarError = (err, contexto) => {
  if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
  if (err.code && String(err.code).startsWith('P')) {
    throw new DatabaseError(`Error de base de datos al ${contexto}`, err.message);
  }
  throw err;
};

// Solo los campos editables: evita que el cuerpo de la petición toque id ni la auditoría de creación
const camposEditables = (data) => {
  const campos = {};
  if (data.codigoSunat !== undefined) campos.codigoSunat = String(data.codigoSunat).trim();
  if (data.descripcion !== undefined) campos.descripcion = String(data.descripcion).trim();
  if (data.requiereRemype !== undefined) campos.requiereRemype = Boolean(data.requiereRemype);
  if (data.activo !== undefined) campos.activo = Boolean(data.activo);
  return campos;
};

async function validar(campos, id = null) {
  if (campos.codigoSunat !== undefined) {
    if (!campos.codigoSunat) throw new ValidationError('El código SUNAT del régimen es obligatorio.');
    if (campos.codigoSunat.length > 5) throw new ValidationError('El código SUNAT no puede exceder 5 caracteres.');
    const duplicado = await prisma.regimenLaboral.findFirst({
      where: { codigoSunat: campos.codigoSunat, ...(id && { id: { not: id } }) },
    });
    if (duplicado) {
      throw new ConflictError(`Ya existe el régimen "${duplicado.descripcion}" con el código SUNAT ${campos.codigoSunat}.`);
    }
  }
  if (campos.descripcion !== undefined) {
    if (!campos.descripcion) throw new ValidationError('La descripción del régimen es obligatoria.');
    if (campos.descripcion.length > 100) throw new ValidationError('La descripción no puede exceder 100 caracteres.');
  }
}

const listar = async () => {
  try {
    return await prisma.regimenLaboral.findMany({ orderBy: { codigoSunat: 'asc' } });
  } catch (err) {
    manejarError(err, 'listar los regímenes laborales');
  }
};

const listarActivos = async () => {
  try {
    return await prisma.regimenLaboral.findMany({ where: { activo: true }, orderBy: { codigoSunat: 'asc' } });
  } catch (err) {
    manejarError(err, 'listar los regímenes laborales activos');
  }
};

const obtenerPorId = async (id) => {
  try {
    const regimen = await prisma.regimenLaboral.findUnique({ where: { id } });
    if (!regimen) throw new NotFoundError('Régimen laboral no encontrado');
    return regimen;
  } catch (err) {
    manejarError(err, 'obtener el régimen laboral');
  }
};

const crear = async (data) => {
  try {
    const campos = camposEditables(data);
    if (campos.codigoSunat === undefined) throw new ValidationError('El código SUNAT del régimen es obligatorio.');
    if (campos.descripcion === undefined) throw new ValidationError('La descripción del régimen es obligatoria.');
    await validar(campos);
    return await prisma.regimenLaboral.create({
      data: { ...campos, creadoPor: data.creadoPor || null },
    });
  } catch (err) {
    manejarError(err, 'crear el régimen laboral');
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.regimenLaboral.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Régimen laboral no encontrado');
    const campos = camposEditables(data);
    await validar(campos, id);
    return await prisma.regimenLaboral.update({
      where: { id },
      data: { ...campos, actualizadoPor: data.actualizadoPor || null },
    });
  } catch (err) {
    manejarError(err, 'actualizar el régimen laboral');
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.regimenLaboral.findUnique({
      where: { id },
      include: { _count: { select: { empresas: true, parametros: true } } },
    });
    if (!existente) throw new NotFoundError('Régimen laboral no encontrado');
    const { empresas, parametros } = existente._count;
    if (empresas > 0 || parametros > 0) {
      throw new ConflictError(
        `No se puede eliminar el régimen "${existente.descripcion}" porque lo usan ${empresas} empresa(s) y tiene ${parametros} parámetro(s) legal(es). Desactívelo en su lugar.`,
      );
    }
    await prisma.regimenLaboral.delete({ where: { id } });
    return true;
  } catch (err) {
    manejarError(err, 'eliminar el régimen laboral');
  }
};

export default { listar, listarActivos, obtenerPorId, crear, actualizar, eliminar };
