import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Embarcacion
 * Valida unicidad, existencia de claves foráneas y previene borrado si tiene dependencias asociadas.
 * Documentado en español.
 */

async function validarUnicidad(activoId, matricula, id = null) {
  const whereActivo = id ? { activoId, NOT: { id } } : { activoId };
  const whereMatricula = id ? { matricula, NOT: { id } } : { matricula };
  const existeActivo = await prisma.embarcacion.findFirst({ where: whereActivo });
  if (existeActivo) throw new ConflictError('Ya existe una embarcación con ese activoId.');
  const existeMatricula = await prisma.embarcacion.findFirst({ where: whereMatricula });
  if (existeMatricula) throw new ConflictError('Ya existe una embarcación con esa matrícula.');
}

async function validarClavesForaneas(data) {
  const [activo, tipoEmbarcacion, estadoActivo, proveedorGps] = await Promise.all([
    prisma.activo.findUnique({ where: { id: data.activoId } }),
    prisma.tipoEmbarcacion.findUnique({ where: { id: data.tipoEmbarcacionId } }),
    prisma.estadoActivo.findUnique({ where: { id: data.estadoActivoId } }),
    data.proveedorGpsId ? prisma.proveedorGps.findUnique({ where: { id: data.proveedorGpsId } }) : Promise.resolve(true)
  ]);
  if (!activo) throw new ValidationError('El activoId no existe.');
  if (!tipoEmbarcacion) throw new ValidationError('El tipoEmbarcacionId no existe.');
  if (!estadoActivo) throw new ValidationError('El estadoActivoId no existe.');
  if (data.proveedorGpsId && !proveedorGps) throw new ValidationError('El proveedorGpsId no existe.');
}

const listar = async () => {
  try {
    return await prisma.embarcacion.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const emb = await prisma.embarcacion.findUnique({ where: { id } });
    if (!emb) throw new NotFoundError('Embarcación no encontrada');
    return emb;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.activoId || !data.matricula || !data.tipoEmbarcacionId || !data.estadoActivoId) {
      throw new ValidationError('Los campos activoId, matricula, tipoEmbarcacionId y estadoActivoId son obligatorios.');
    }
    await validarUnicidad(data.activoId, data.matricula);
    await validarClavesForaneas(data);
    return await prisma.embarcacion.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.embarcacion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Embarcación no encontrada');
    if ((data.activoId && data.activoId !== existente.activoId) || (data.matricula && data.matricula !== existente.matricula)) {
      await validarUnicidad(data.activoId || existente.activoId, data.matricula || existente.matricula, id);
    }
    // Validar claves foráneas si cambian
    const claves = ['activoId','tipoEmbarcacionId','estadoActivoId','proveedorGpsId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.embarcacion.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.embarcacion.findUnique({
      where: { id },
      include: { documentaciones: true, faenas: true, faenasConsumo: true }
    });
    if (!existente) throw new NotFoundError('Embarcación no encontrada');
    if ((existente.documentaciones && existente.documentaciones.length > 0) || (existente.faenas && existente.faenas.length > 0) || (existente.faenasConsumo && existente.faenasConsumo.length > 0)) {
      throw new ConflictError('No se puede eliminar porque tiene documentaciones, faenas o faenas de consumo asociadas.');
    }
    await prisma.embarcacion.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};
