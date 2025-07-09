import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para NovedadPescaConsumo
 * Valida existencia de claves foráneas y previene borrado si tiene dependencias asociadas.
 * Documentado en español.
 */

async function validarClavesForaneas(data) {
  const [empresa, bahia] = await Promise.all([
    prisma.empresa.findUnique({ where: { id: data.empresaId } }),
    prisma.bahia.findUnique({ where: { id: data.BahiaId } })
  ]);
  if (!empresa) throw new ValidationError('El empresaId no existe.');
  if (!bahia) throw new ValidationError('El BahiaId no existe.');
}

async function tieneDependencias(id) {
  const novedad = await prisma.novedadPescaConsumo.findUnique({
    where: { id },
    include: {
      faenas: true,
      entregasARendir: true,
      liqNovedad: true
    }
  });
  if (!novedad) throw new NotFoundError('NovedadPescaConsumo no encontrada');
  return (
    (novedad.faenas && novedad.faenas.length > 0) ||
    (novedad.entregasARendir && novedad.entregasARendir.length > 0) ||
    !!novedad.liqNovedad
  );
}

const listar = async () => {
  try {
    return await prisma.novedadPescaConsumo.findMany();
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const obtenerPorId = async (id) => {
  try {
    const novedad = await prisma.novedadPescaConsumo.findUnique({ where: { id } });
    if (!novedad) throw new NotFoundError('NovedadPescaConsumo no encontrada');
    return novedad;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const crear = async (data) => {
  try {
    const obligatorios = ['empresaId','BahiaId','nombre','fechaInicio','fechaFin'];
    for (const campo of obligatorios) {
      if (typeof data[campo] === 'undefined' || data[campo] === null) {
        throw new ValidationError(`El campo ${campo} es obligatorio.`);
      }
    }
    await validarClavesForaneas(data);
    return await prisma.novedadPescaConsumo.create({ data });
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const actualizar = async (id, data) => {
  try {
    const existente = await prisma.novedadPescaConsumo.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('NovedadPescaConsumo no encontrada');
    // Validar claves foráneas si cambian
    const claves = ['empresaId','BahiaId'];
    if (claves.some(k => data[k] && data[k] !== existente[k])) {
      await validarClavesForaneas({ ...existente, ...data });
    }
    return await prisma.novedadPescaConsumo.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

const eliminar = async (id) => {
  try {
    if (await tieneDependencias(id)) {
      throw new ConflictError('No se puede eliminar porque tiene dependencias asociadas.');
    }
    await prisma.novedadPescaConsumo.delete({ where: { id } });
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
