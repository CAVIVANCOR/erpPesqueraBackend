import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para AccesosUsuario
 * Aplica validaciones de unicidad lógica, referencias foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida unicidad lógica (usuarioId + submoduloId) y existencia de referencias foráneas.
 * Lanza ConflictError o ValidationError según corresponda.
 * @param {Object} data - Datos del acceso
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarAcceso(data, excluirId = null) {
  // Validar unicidad lógica
  if (data.usuarioId && data.submoduloId) {
    const where = excluirId ? {
      usuarioId: data.usuarioId,
      submoduloId: data.submoduloId,
      id: { not: excluirId }
    } : {
      usuarioId: data.usuarioId,
      submoduloId: data.submoduloId
    };
    const existe = await prisma.accesosUsuario.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un acceso para ese usuario y submódulo.');
  }
  // Validar existencia de Usuario
  if (data.usuarioId) {
    const usuario = await prisma.usuario.findUnique({ where: { id: data.usuarioId } });
    if (!usuario) throw new ValidationError('Usuario no existente.');
  }
  // Validar existencia de SubmoduloSistema
  if (data.submoduloId) {
    const submodulo = await prisma.submoduloSistema.findUnique({ where: { id: data.submoduloId } });
    if (!submodulo) throw new ValidationError('Submódulo no existente.');
  }
}

/**
 * Lista todos los accesos de usuario, incluyendo relaciones principales.
 */
const listar = async () => {
  try {
    return await prisma.accesosUsuario.findMany({
      include: {
        usuario: true,
        submodulo: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un acceso por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const acceso = await prisma.accesosUsuario.findUnique({
      where: { id },
      include: {
        usuario: true,
        submodulo: true
      }
    });
    if (!acceso) throw new NotFoundError('Acceso de usuario no encontrado');
    return acceso;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un acceso de usuario validando unicidad lógica y referencias.
 */
const crear = async (data) => {
  try {
    await validarAcceso(data);
    return await prisma.accesosUsuario.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un acceso de usuario existente, validando existencia, unicidad lógica y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.accesosUsuario.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Acceso de usuario no encontrado');
    await validarAcceso(data, id);
    return await prisma.accesosUsuario.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un acceso de usuario por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.accesosUsuario.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Acceso de usuario no encontrado');
    await prisma.accesosUsuario.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
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
