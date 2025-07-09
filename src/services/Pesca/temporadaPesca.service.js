import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TemporadaPesca
 * Valida existencia de claves foráneas, solapamiento de fechas y previene borrado si tiene dependencias asociadas.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [empresa, bahia, especie] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: data.empresaId } }),
    prisma.bahia.findUnique({ where: { id: data.BahiaId } }),
    prisma.especie.findUnique({ where: { id: data.especieId } })
  ]);
  if (!empresa) throw new ValidationError('El empresaId no existe.');
  if (!bahia) throw new ValidationError('El BahiaId no existe.');
  if (!especie) throw new ValidationError('El especieId no existe.');
}

async function validarSolapamiento(data, id = null) {
  // No permitir temporadas con mismo nombre/empresa/especie y fechas que se solapen
  const where = {
    nombre: data.nombre,
    empresaId: data.empresaId,
    especieId: data.especieId,
    AND: [
      { fechaInicio: { lte: data.fechaFin } },
      { fechaFin: { gte: data.fechaInicio } }
    ]
  };
  if (id) where['NOT'] = { id };
  const existe = await prisma.temporadaPesca.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe una temporada con el mismo nombre, empresa y especie en un rango de fechas solapado.');
}

const listar = async () => {
  try {
    return await prisma.temporadaPesca.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const temp = await prisma.temporadaPesca.findUnique({ where: { id } });
    if (!temp) throw new NotFoundError('TemporadaPesca no encontrada');
    return temp;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    if (!data.empresaId || !data.BahiaId || !data.nombre || !data.especieId || !data.fechaInicio || !data.fechaFin) {
      throw new ValidationError('Todos los campos obligatorios deben estar completos.');
    }
    await validarClavesForaneas(data);
    await validarSolapamiento(data);
    return await prisma.temporadaPesca.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.temporadaPesca.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TemporadaPesca no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['empresaId','BahiaId','especieId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    // Validar solapamiento si cambian nombre, fechas, empresa o especie
    if (data.nombre || data.fechaInicio || data.fechaFin || data.empresaId || data.especieId) {
      await validarSolapamiento({ ...existente, ...data }, id);
    }
    return await prisma.temporadaPesca.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    const existente = await prisma.temporadaPesca.findUnique({
      where: { id },
      include: { faenas: true, entregasARendir: true, liquidacionTemporada: true }
    });
    if (!existente) throw new NotFoundError('TemporadaPesca no encontrada');
    if ((existente.faenas && existente.faenas.length > 0) || (existente.entregasARendir && existente.entregasARendir.length > 0) || existente.liquidacionTemporada) {
      throw new ConflictError('No se puede eliminar porque tiene faenas, entregas o liquidación asociada.');
    }
    await prisma.temporadaPesca.delete({ where: { id } });
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
