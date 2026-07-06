import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para TipoDetraccion
 * Catálogo de tipos de detracción según SUNAT
 * Documentado en español.
 */

/**
 * Valida unicidad de codigo.
 */
async function validarTipoDetraccion(data, excluirId = null) {
  if (data.codigo) {
    const where = excluirId ? { codigo: data.codigo, id: { not: excluirId } } : { codigo: data.codigo };
    const existe = await prisma.tipoDetraccion.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un tipo de detracción con ese código.');
  }
}

/**
 * Lista todos los tipos de detracción.
 */
const listar = async () => {
  try {
    return await prisma.tipoDetraccion.findMany({
      orderBy: { codigo: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Lista solo tipos de detracción activos.
 */
const listarActivos = async () => {
  try {
    return await prisma.tipoDetraccion.findMany({
      where: { activo: true },
      orderBy: { codigo: 'asc' }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un tipo de detracción por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const tipoDetraccion = await prisma.tipoDetraccion.findUnique({ where: { id } });
    if (!tipoDetraccion) throw new NotFoundError('Tipo de detracción no encontrado');
    return tipoDetraccion;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un tipo de detracción validando unicidad.
 */
const crear = async (data) => {
  try {
    await validarTipoDetraccion(data);
    return await prisma.tipoDetraccion.create({ data });
  } catch (err) {
    if (err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un tipo de detracción existente.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.tipoDetraccion.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Tipo de detracción no encontrado');
    await validarTipoDetraccion(data, id);
    return await prisma.tipoDetraccion.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un tipo de detracción por ID.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.tipoDetraccion.findUnique({
      where: { id },
      include: { productos: true }
    });
    if (!existente) throw new NotFoundError('Tipo de detracción no encontrado');
    if (existente.productos && existente.productos.length > 0) {
      throw new ConflictError('No se puede eliminar el tipo de detracción porque tiene productos asociados.');
    }
    await prisma.tipoDetraccion.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError || err instanceof ConflictError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  listarActivos,
  obtenerPorId,
  crear,
  actualizar,
  eliminar
};