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
        empresa: true,
        accesosUsuario: {
          include: {
            submodulo: {
              include: {
                modulo: true
              }
            }
          }
        }
      },
      orderBy: {
        fechaCreacion: 'desc'
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
        empresa: true,
        accesosUsuario: {
          include: {
            submodulo: {
              include: {
                modulo: true
              }
            }
          }
        }
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
const bcrypt = await import('bcrypt');

/**
 * Crea un usuario nuevo validando unicidad y referencias. Siempre almacena la contraseña de forma segura (hasheada).
 * @param {Object} data - Datos del usuario, debe incluir 'password' en texto plano.
 * @returns {Promise<Object>} El usuario creado
 * @throws {ValidationError|ConflictError}
 */
const crear = async (data) => {
  try {
    await validarUsuario(data);
    // Validar que se recibe la contraseña en texto plano
    if (!data.password) {
      throw new ValidationError('La contraseña es obligatoria al crear un usuario.');
    }
    // Hashear la contraseña
    const passwordHash = await bcrypt.default.hash(data.password, 10);
    // Eliminar el campo password en texto plano antes de guardar
    const usuarioData = { ...data, passwordHash };
    delete usuarioData.password;
    return await prisma.usuario.create({ data: usuarioData });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Actualiza un usuario existente, validando existencia, unicidad y referencias.
 */
/**
 * Actualiza un usuario existente, validando existencia, unicidad y referencias.
 * Si se recibe un nuevo 'password', lo hashea y lo actualiza; si no, mantiene el hash existente.
 * @param {number} id - ID del usuario a actualizar
 * @param {Object} data - Datos a actualizar, puede incluir 'password'
 * @returns {Promise<Object>} El usuario actualizado
 * @throws {ValidationError|ConflictError|NotFoundError}
 */
const actualizar = async (id, data) => {
  try {
    const existente = await prisma.usuario.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Usuario no encontrado');
    await validarUsuario(data, id);
    let usuarioData = { ...data };
    
    // Eliminar campos que no se pueden actualizar directamente
    delete usuarioData.empresaId;
    delete usuarioData.personalId;
    delete usuarioData.cesado; // Campo obsoleto
    delete usuarioData.accesosUsuario; // Se maneja por separado
    
    // Si se recibe una nueva contraseña, hashearla
    if (data.password) {
      usuarioData.passwordHash = await bcrypt.default.hash(data.password, 10);
      delete usuarioData.password;
    }
    
    return await prisma.usuario.update({ where: { id }, data: usuarioData });
  } catch (err) {
    if (err instanceof ConflictError || err instanceof NotFoundError || err instanceof ValidationError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Elimina un usuario por ID, validando existencia.
 * Primero elimina todos los accesos del usuario (eliminación en cascada manual).
 */
const eliminar = async (id) => {
  try {
    const existente = await prisma.usuario.findUnique({ where: { id } });
    if (!existente) throw new NotFoundError('Usuario no encontrado');
    
    // Eliminar primero todos los accesos del usuario (cascada manual)
    await prisma.accesosUsuario.deleteMany({
      where: { usuarioId: id }
    });
    
    // Ahora eliminar el usuario
    await prisma.usuario.delete({ where: { id } });
    return true;
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Crea el primer superusuario y toda la jerarquía relacionada en una sola transacción.
 * Solo permite la creación si no existen usuarios.
 */
const crearSuperusuarioEnCascada = async (data) => {
  const count = await prisma.usuario.count();
  if (count > 0) throw new ConflictError('Ya existen usuarios en el sistema.');
  return await prisma.$transaction(async (prisma) => {
    // 1. Verifica que exista el cargo S/C (Sin Cargo) con id=1
    let sinCargo = await prisma.cargosPersonal.findUnique({ where: { id: 1 } });
    if (!sinCargo) {
      sinCargo = await prisma.cargosPersonal.create({
        data: {
          id: 1,
          descripcion: 'S/C',
        }
      });
      
    } else if (sinCargo.descripcion !== 'S/C') {
      // Si existe pero el nombre es incorrecto, lo actualiza
      await prisma.cargosPersonal.update({
        where: { id: 1 },
        data: { descripcion: 'S/C'}
      });
    }

    // 2. Crear o buscar el cargo ESPECIALISTA TIC
    let cargo = await prisma.cargosPersonal.findFirst({ where: { descripcion: 'ESPECIALISTA TIC' } });
    if (!cargo) {
      cargo = await prisma.cargosPersonal.create({
        data: { descripcion: 'ESPECIALISTA TIC' }
      });
    }
    // 3. Crear el registro de personal
    const personal = await prisma.personal.create({
      data: {
        nombres: data.nombres,
        apellidos: data.apellidos,
        correo: data.email,
        cargoId: cargo.id,
        numeroDocumento: data.numeroDocumento,
        fechaNacimiento: data.fechaNacimiento,
        sexo: data.sexo,
        empresaId: data.empresaId,
        // Agrega aquí otros campos requeridos por tu modelo
        fechaIngreso: new Date(),
        cesado: false
      }
    });
    // 4. Crear el usuario asociado
    const passwordHash = await bcrypt.default.hash(data.password, 10);
    const usuario = await prisma.usuario.create({
      data: {
        username: data.username,
        passwordHash,
        personalId: personal.id,
        empresaId: data.empresaId,
        esSuperUsuario: true,
        esAdmin: true,
        esUsuario: false,
        activo: true,
        fechaCreacion: new Date(),
        fechaUltimoAcceso: new Date()
      }
    });
    return usuario;
  });
};

const contarUsuarios = async () => {
  return await prisma.usuario.count();
};

/**
 * Verifica si un usuario puede acceder al sistema
 * @param {BigInt} usuarioId - ID del usuario
 * @returns {Promise<Boolean>}
 */
const puedeAcceder = async (usuarioId) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { personal: true }
    });
    
    if (!usuario) return false;
    
    // 0. SUPERUSUARIO SIEMPRE TIENE ACCESO (BYPASS TOTAL)
    if (usuario.esSuperUsuario) return true;
    
    // 1. Usuario debe estar activo en el sistema
    if (!usuario.activo) return false;
    
    // 2. Usuario no debe estar bloqueado temporalmente
    if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
      return false;
    }
    
    // 3. Si tiene personal asociado, verificar que no esté cesado
    if (usuario.personal && usuario.personal.cesado) {
      return false;
    }
    
    return true;
  } catch (err) {
    throw err;
  }
};

/**
 * Desactiva un usuario (soft delete)
 * @param {BigInt} usuarioId - ID del usuario a desactivar
 * @param {String} motivoInactivacion - Razón de la desactivación
 * @param {BigInt} inactivadoPor - ID del usuario que desactiva
 * @returns {Promise<Object>}
 */
const desactivarUsuario = async (usuarioId, motivoInactivacion, inactivadoPor) => {
  try {
    return await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        activo: false,
        motivoInactivacion,
        inactivadoPor,
        fechaInactivacion: new Date()
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Reactiva un usuario
 * @param {BigInt} usuarioId - ID del usuario a reactivar
 * @returns {Promise<Object>}
 */
const reactivarUsuario = async (usuarioId) => {
  try {
    return await prisma.usuario.update({
      where: { id: usuarioId },
      data: {
        activo: true,
        motivoInactivacion: null,
        inactivadoPor: null,
        fechaInactivacion: null,
        intentosFallidos: 0,
        bloqueadoHasta: null
      }
    });
  } catch (err) {
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Obtiene los accesos completos de un usuario con estructura jerárquica
 * @param {BigInt} usuarioId - ID del usuario
 * @returns {Promise<Array>} Estructura de módulos con submódulos y permisos
 */
const obtenerAccesosUsuario = async (usuarioId) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        accesosUsuario: {
          where: { activo: true },
          include: {
            submodulo: {
              where: { activo: true },
              include: {
                modulo: {
                  where: { activo: true }
                }
              }
            }
          }
        }
      }
    });

    if (!usuario) throw new NotFoundError('Usuario no encontrado');

    // Si es superusuario, tiene acceso total
    if (usuario.esSuperUsuario) {
      const todosModulos = await prisma.moduloSistema.findMany({
        where: { activo: true },
        include: {
          submodulos: {
            where: { activo: true },
            orderBy: { orden: 'asc' }
          }
        }
      });
      
      return todosModulos.map(modulo => ({
        id: modulo.id,
        nombre: modulo.nombre,
        descripcion: modulo.descripcion,
        submodulos: modulo.submodulos.map(sub => ({
          id: sub.id,
          nombre: sub.nombre,
          descripcion: sub.descripcion,
          ruta: sub.ruta,
          icono: sub.icono,
          permisos: {
            puedeVer: true,
            puedeCrear: true,
            puedeEditar: true,
            puedeEliminar: true,
            puedeReactivarDocs: true,
            puedeAprobarDocs: true,
            puedeRechazarDocs: true
          }
        }))
      }));
    }

    // Estructurar accesos por módulo
    const accesosEstructurados = {};
    
    for (const acceso of usuario.accesosUsuario) {
      const modulo = acceso.submodulo.modulo;
      const submodulo = acceso.submodulo;
      
      if (!accesosEstructurados[modulo.id]) {
        accesosEstructurados[modulo.id] = {
          id: modulo.id,
          nombre: modulo.nombre,
          descripcion: modulo.descripcion,
          submodulos: []
        };
      }
      
      accesosEstructurados[modulo.id].submodulos.push({
        id: submodulo.id,
        nombre: submodulo.nombre,
        descripcion: submodulo.descripcion,
        ruta: submodulo.ruta,
        icono: submodulo.icono,
        permisos: {
          puedeVer: acceso.puedeVer,
          puedeCrear: acceso.puedeCrear,
          puedeEditar: acceso.puedeEditar,
          puedeEliminar: acceso.puedeEliminar,
          puedeReactivarDocs: acceso.puedeReactivarDocs,
          puedeAprobarDocs: acceso.puedeAprobarDocs,
          puedeRechazarDocs: acceso.puedeRechazarDocs
        }
      });
    }
    
    return Object.values(accesosEstructurados);
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    if (err.code && err.code.startsWith('P')) throw new DatabaseError('Error de base de datos', err.message);
    throw err;
  }
};

/**
 * Verifica si un usuario tiene un permiso específico en un submódulo
 * @param {BigInt} usuarioId - ID del usuario
 * @param {BigInt} submoduloId - ID del submódulo
 * @param {String} permiso - Tipo de permiso ('ver', 'crear', 'editar', 'eliminar', etc.)
 * @returns {Promise<Boolean>}
 */
const verificarPermiso = async (usuarioId, submoduloId, permiso) => {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId }
    });
    
    // Superusuario tiene todos los permisos
    if (usuario?.esSuperUsuario) return true;
    
    const acceso = await prisma.accesosUsuario.findFirst({
      where: {
        usuarioId,
        submoduloId,
        activo: true
      }
    });
    
    if (!acceso) return false;
    
    const mapaPermisos = {
      'ver': acceso.puedeVer,
      'crear': acceso.puedeCrear,
      'editar': acceso.puedeEditar,
      'eliminar': acceso.puedeEliminar,
      'reactivar': acceso.puedeReactivarDocs,
      'aprobar': acceso.puedeAprobarDocs,
      'rechazar': acceso.puedeRechazarDocs
    };
    
    return mapaPermisos[permiso] || false;
  } catch (err) {
    throw err;
  }
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  crearSuperusuarioEnCascada,
  contarUsuarios,
  puedeAcceder,
  desactivarUsuario,
  reactivarUsuario,
  obtenerAccesosUsuario,
  verificarPermiso
};
