import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoMantenimiento
 * Valida unicidad de nombre y previene borrado si tiene órdenes asociadas.
 * Documentado en español.
 */

async function validarUnicidadNombre(nombre, id = null) {
  const where = id ? { nombre, NOT: { id } } : { nombre };
  const existe = await prisma.tipoMantenimiento.findFirst({ where });
  if (existe) throw new ConflictError('Ya existe un Tipo de Mantenimiento con ese nombre.');
}

const listar = async () => {
  try {
    return await prisma.tipoMantenimiento.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de mantenimiento por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const tipo = await prisma.tipoMantenimiento.findUnique({ where: { id } });
    if (!tipo) throw new NotFoundError('TipoMantenimiento no encontrado');
    return tipo;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de mantenimiento validando campo obligatorio.
 */
const crear = async (data) => {
  try {
    if (!data.nombre) {
      throw new ValidationError('El campo nombre es obligatorio.');
    }
    if (data.nombre.length > 20) {
      throw new ValidationError('El nombre no puede superar los 20 caracteres.');
    }
    await validarUnicidadNombre(data.nombre);
    
    return await prisma.tipoMantenimiento.create({ data });
  } catch (err) {
    if (err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de mantenimiento existente, validando campo obligatorio.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoMantenimiento.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('TipoMantenimiento no encontrado');
    
    if (data.nombre) {
      if (data.nombre.length > 20) {
        throw new ValidationError('El nombre no puede superar los 20 caracteres.');
      }
      if (data.nombre !== existente.nombre) {
        await validarUnicidadNombre(data.nombre, id);
      }
    }
    
    return await prisma.tipoMantenimiento.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ValidationError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de mantenimiento por ID, previniendo si tiene órdenes asociadas.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoMantenimiento.findUnique({
      where: { id },
      include: { ordenesMantenimiento: true }
    });
    if (!existente) throw new NotFoundError('TipoMantenimiento no encontrado');
    
    // Validar que no tenga registros asociados
    if (existente.ordenesMantenimiento && existente.ordenesMantenimiento.length > 0) {
      throw new ConflictError('No se puede eliminar porque tiene órdenes de mantenimiento asociadas.');
    }
    
    await prisma.tipoMantenimiento.delete({ where: { id } });
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
