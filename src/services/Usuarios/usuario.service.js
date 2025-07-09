import prisma from '../../config/prismaClient.js';
import { NotFoundError, DatabaseError, ValidationError, ConflictError } from '../../utils/errors.js';

/**
 * Servicio CRUD para Usuario
 * Aplica validaciones de unicidad, referencias foráneas y manejo de errores personalizado.
 * Documentado en español.
 */

/**
 * Valida que el username y el personalId sean únicos y que las referencias existan.
 * Lanza ConflictError o ValidationError según corresponda.
 * @param {Object} data - Datos del usuario
 * @param {number|null} excluirId - Si se actualiza, excluir el propio ID de la búsqueda
 */
async function validarUsuario(data, excluirId = null) {
  // Validar unicidad username
  if (data.username) {
    const where = excluirId ? { username: data.username, id: { not: excluirId } } : { username: data.username };
    const existe = await prisma.usuario.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un usuario con ese nombre de usuario.');
  }

  // Validar unicidad personalId (si se provee)
  if (data.personalId !== undefined && data.personalId !== null) {
    const where = excluirId ? { personalId: data.personalId, id: { not: excluirId } } : { personalId: data.personalId };
    const existe = await prisma.usuario.findFirst({ where });
    if (existe) throw new ConflictError('Ya existe un usuario asociado a ese personal.');
    // Validar existencia de Personal
    const personal = await prisma.personal.findUnique({ where: { id: data.personalId } });
    if (!personal) throw new ValidationError('Personal no existente.');
  }

  // Validar existencia de Empresa
  if (data.empresaId !== undefined && data.empresaId !== null) {
    const empresa = await prisma.empresa.findUnique({ where: { id: data.empresaId } });
    if (!empresa) throw new ValidationError('Empresa no existente.');
  }
}

/**
 * Lista todos los usuarios, incluyendo relaciones principales.
 */
const listar = async () => {
  try {
    return await prisma.usuario.findMany({
      include: {
        personal: true,
        accesosUsuario: true
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene un usuario por ID.
 */
const obtenerPorId = async (id) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id },
      include: {
        personal: true,
        accesosUsuario: true
      }
    });
    if (!usuario) throw new NotFoundError('Usuario no encontrado');
    return usuario;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea un usuario nuevo validando unicidad y referencias.
 */
const crear = async (data) => {
  try {
    await validarUsuario(data);
    return await prisma.usuario.create({ data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un usuario existente, validando existencia, unicidad y referencias.
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.usuario.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Usuario no encontrado');
    await validarUsuario(data, id);
    return await prisma.usuario.update({ where: { id }, data });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un usuario por ID, validando existencia.
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.usuario.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Usuario no encontrado');
    await prisma.usuario.delete({ where: { id } });
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
