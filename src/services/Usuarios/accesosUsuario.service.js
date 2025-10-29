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
 * Lista todos los accesos de usuario (activos e inactivos), incluyendo relaciones principales.
 */
const listar = async () => {
  try {
    return await prisma.accesosUsuario.findMany({
      include: {
        usuario: {
          include: {
            personal: true
          }
        },
        submodulo: {
          include: {
            modulo: true
          }
        }
      },
      orderBy: {
        fechaOtorgado: 'desc'
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
        usuario: {
          include: {
            personal: true
          }
        },
        submodulo: {
          include: {
            modulo: true
          }
        }
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
 * Lista todos los accesos de un usuario específico (activos e inactivos)
 * @param {BigInt} usuarioId - ID del usuario
 * @returns {Promise<Array>}
 */
const listarPorUsuario = async (usuarioId) => {
  try {
    return await prisma.accesosUsuario.findMany({
      where: {
        usuarioId
      },
      include: {
        submodulo: {
          include: {
            modulo: true
          }
        }
      },
      orderBy: [
        { submodulo: { modulo: { nombre: 'asc' } } },
        { submodulo: { orden: 'asc' } }
      ]
    });
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

/**
 * Otorga accesos masivos a un usuario para múltiples submódulos
 * @param {BigInt} usuarioId - ID del usuario
 * @param {Array} accesos - Array de objetos con submoduloId y permisos
 * @param {BigInt} otorgadoPor - ID del usuario que otorga los accesos
 * @returns {Promise<Array>}
 */
const otorgarAccesosMasivos = async (usuarioId, accesos, otorgadoPor) => {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new ValidationError('Usuario no existente.');

    const accesosCreados = [];
    
    for (const acceso of accesos) {
      // Verificar si ya existe el acceso
      const existente = await prisma.accesosUsuario.findFirst({
        where: {
          usuarioId,
          submoduloId: acceso.submoduloId
        }
      });

      if (existente) {
        // Actualizar si existe
        const actualizado = await prisma.accesosUsuario.update({
          where: { id: existente.id },
          data: {
            ...acceso,
            activo: true,
            otorgadoPor,
            fechaOtorgado: new Date()
          }
        });
        accesosCreados.push(actualizado);
      } else {
        // Crear si no existe
        const nuevo = await prisma.accesosUsuario.create({
          data: {
            usuarioId,
            ...acceso,
            otorgadoPor,
            activo: true
          }
        });
        accesosCreados.push(nuevo);
      }
    }

    return accesosCreados;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Revoca un acceso (soft delete)
 * @param {BigInt} accesoId - ID del acceso a revocar
 * @param {BigInt} revocadoPor - ID del usuario que revoca
 * @returns {Promise<Object>}
 */
const revocarAcceso = async (accesoId, revocadoPor) => {
  try {
    const existente = await prisma.accesosUsuario.findUnique({ where: { id: accesoId } });
    if (!existente) throw new NotFoundError('Acceso de usuario no encontrado');

    return await prisma.accesosUsuario.update({
      where: { id: accesoId },
      data: {
        activo: false,
        revocadoPor,
        fechaRevocado: new Date()
      }
    });
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Clona los accesos de un usuario a otro
 * @param {BigInt} usuarioOrigenId - ID del usuario origen
 * @param {BigInt} usuarioDestinoId - ID del usuario destino
 * @param {BigInt} otorgadoPor - ID del usuario que otorga
 * @returns {Promise<Array>}
 */
const clonarAccesos = async (usuarioOrigenId, usuarioDestinoId, otorgadoPor) => {
  try {
    const usuarioOrigen = await prisma.usuario.findUnique({ where: { id: usuarioOrigenId } });
    const usuarioDestino = await prisma.usuario.findUnique({ where: { id: usuarioDestinoId } });
    
    if (!usuarioOrigen) throw new ValidationError('Usuario origen no existente.');
    if (!usuarioDestino) throw new ValidationError('Usuario destino no existente.');

    const accesosOrigen = await prisma.accesosUsuario.findMany({
      where: {
        usuarioId: usuarioOrigenId,
        activo: true
      }
    });

    const accesosAOtorgar = accesosOrigen.map(acceso => ({
      submoduloId: acceso.submoduloId,
      puedeVer: acceso.puedeVer,
      puedeCrear: acceso.puedeCrear,
      puedeEditar: acceso.puedeEditar,
      puedeEliminar: acceso.puedeEliminar,
      puedeReactivarDocs: acceso.puedeReactivarDocs,
      puedeAprobarDocs: acceso.puedeAprobarDocs,
      puedeRechazarDocs: acceso.puedeRechazarDocs
    }));

    return await otorgarAccesosMasivos(usuarioDestinoId, accesosAOtorgar, otorgadoPor);
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Alias de listarPorUsuario para compatibilidad con controlador
 */
const obtenerPorUsuario = listarPorUsuario;

/**
 * Asigna múltiples accesos a un usuario con permisos personalizados
 * @param {BigInt} usuarioId - ID del usuario
 * @param {Array<BigInt|Object>} submodulosIds - Array de IDs de submódulos o array de objetos con {submoduloId, permisos}
 * @param {Object} permisosDefecto - Permisos por defecto si no se especifican
 * @returns {Promise<Array>}
 */
const asignarAccesosEnLote = async (usuarioId, submodulosIds, permisosDefecto = null) => {
  try {
    const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario) throw new ValidationError('Usuario no existente.');

    const accesosCreados = [];
    
    for (const item of submodulosIds) {
      // Determinar submoduloId y permisos
      let submoduloIdRaw, permisos;
      
      if (typeof item === 'object' && item !== null && item.submoduloId !== undefined) {
        submoduloIdRaw = item.submoduloId;
        permisos = item.permisos || permisosDefecto || {};
      } else {
        submoduloIdRaw = item;
        permisos = permisosDefecto || {};
      }
      
      // Validar y convertir submoduloId
      if (submoduloIdRaw === null || submoduloIdRaw === undefined || submoduloIdRaw === '') {
        continue; // Saltar items inválidos
      }
      
      // Convertir a número primero para validar
      const submoduloIdNum = Number(submoduloIdRaw);
      if (isNaN(submoduloIdNum) || !Number.isInteger(submoduloIdNum)) {
        continue; // Saltar items inválidos
      }
      
      const submoduloId = BigInt(submoduloIdNum);
      
      // Permisos por defecto si no se especifican
      const permisosFinales = {
        puedeVer: permisos.puedeVer !== undefined ? permisos.puedeVer : true,
        puedeCrear: permisos.puedeCrear !== undefined ? permisos.puedeCrear : true,
        puedeEditar: permisos.puedeEditar !== undefined ? permisos.puedeEditar : true,
        puedeEliminar: permisos.puedeEliminar !== undefined ? permisos.puedeEliminar : true,
        puedeAprobarDocs: permisos.puedeAprobarDocs !== undefined ? permisos.puedeAprobarDocs : true,
        puedeRechazarDocs: permisos.puedeRechazarDocs !== undefined ? permisos.puedeRechazarDocs : true,
        puedeReactivarDocs: permisos.puedeReactivarDocs !== undefined ? permisos.puedeReactivarDocs : true,
        activo: permisos.activo !== undefined ? permisos.activo : true
      };
      
      // Verificar si ya existe el acceso
      const existente = await prisma.accesosUsuario.findFirst({
        where: {
          usuarioId,
          submoduloId
        }
      });

      if (!existente) {
        // Crear solo si no existe
        const nuevo = await prisma.accesosUsuario.create({
          data: {
            usuarioId,
            submoduloId,
            ...permisosFinales
          }
        });
        accesosCreados.push(nuevo);
      } else {
        // Si ya existe, ACTUALIZAR con los permisos especificados
        const actualizado = await prisma.accesosUsuario.update({
          where: { id: existente.id },
          data: {
            ...permisosFinales,
            fechaOtorgado: new Date()
          }
        });
        accesosCreados.push(actualizado);
      }
    }

    return accesosCreados;
  } catch (err) {
    if (err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Revoca múltiples accesos de un usuario
 * @param {BigInt} usuarioId - ID del usuario
 * @param {Array<BigInt>} submodulosIds - Array de IDs de submódulos
 * @returns {Promise<number>} - Cantidad de accesos revocados
 */
const revocarAccesosEnLote = async (usuarioId, submodulosIds) => {
  try {
    const resultado = await prisma.accesosUsuario.updateMany({
      where: {
        usuarioId,
        submoduloId: { in: submodulosIds },
        activo: true
      },
      data: {
        activo: false,
        fechaRevocado: new Date()
      }
    });

    return resultado.count;
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  listarPorUsuario,
  obtenerPorUsuario,
  crear,
  actualizar,
  eliminar,
  otorgarAccesosMasivos,
  revocarAcceso,
  clonarAccesos,
  asignarAccesosEnLote,
  revocarAccesosEnLote
};
