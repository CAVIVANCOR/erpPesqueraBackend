import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para MotivoOriginoOT
 * Valida unicidad de nombre y previene borrado si tiene órdenes asociadas.
 * Documentado en español.
 */

async function validarUnicidadNombre(nombre, id = null) {
  const where = id ? { nombre, NOT: { id } } : { nombre };
  const existe = await prisma.motivoOriginoOT.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un Motivo de Origen con ese nombre.');
}

/**
 * Lista todos los motivos de origen de OT activos.
 */
const listar = async () => {
  try {
    return await prisma.motivoOriginoOT.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un motivo de origen por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const motivo = await prisma.motivoOriginoOT.findUnique({ where: { id } });
    if (!motivo) throw new NotFoundError('MotivoOriginoOT no encontrado');
    return motivo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un motivo de origen validando campo obligatorio y unicidad.
 */
const crear = async (data) => {
  try {
    if (!data.nombre) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    if (data.nombre.length > 40) {
      throw new ValidationError('El nombre no puede superar los 40 caracteres.');
    }
    await validarUnicidadNombre(data.nombre);
    
    return await prisma.motivoOriginoOT.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un motivo de origen existente, validando campo obligatorio y unicidad.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.motivoOriginoOT.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('MotivoOriginoOT no encontrado');
    
    if (data.nombre) {
      if (data.nombre.length > 40) {
        throw new ValidationError('El nombre no puede superar los 40 caracteres.');
      }
      if (data.nombre !== existente.nombre) {
        await validarUnicidadNombre(data.nombre, id);
      }
    }
    
    return await prisma.motivoOriginoOT.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un motivo de origen por ID, previniendo si tiene órdenes asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.motivoOriginoOT.findUnique({
      where: { id },
      include: { ordenesTrabajo: true }
    });
    if (!existente) throw new NotFoundError('MotivoOriginoOT no encontrado');
    if (existente.ordenesTrabajo && existente.ordenesTrabajo.length > 0) {
      throw new ConflictError('No se puede eliminar el motivo de origen porque tiene órdenes de trabajo asociadas.');
    }
    await prisma.motivoOriginoOT.delete({ where: { id } });
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
