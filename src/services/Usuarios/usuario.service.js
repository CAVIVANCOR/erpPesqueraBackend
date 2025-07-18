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

/**
 * Crea el primer superusuario y toda la jerarquía relacionada en una sola transacción.
 * Solo permite la creación si no existen usuarios.
 */
const crearSuperusuarioEnCascada = async (data) => {
  const count = await prisma.usuario.count();
  console.log("Paso 1: contando usuarios");

  if (count > 0) throw new ConflictError('Ya existen usuarios en el sistema.');

  return await prisma.$transaction(async (prisma) => {
    // 1. Verifica que exista el cargo S/C (Sin Cargo) con id=1
    let sinCargo = await prisma.cargosPersonal.findUnique({ where: { id: 1 } });
    console.log("Paso 2: verificando cargo S/C");

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
    console.log("Paso 3: creando cargo S/C");

    // 2. Crear o buscar el cargo ESPECIALISTA TIC
    let cargo = await prisma.cargosPersonal.findFirst({ where: { descripcion: 'ESPECIALISTA TIC' } });
    console.log("Paso 4: verificando cargo ESPECIALISTA TIC", cargo);
    if (!cargo) {
      cargo = await prisma.cargosPersonal.create({
        data: { descripcion: 'ESPECIALISTA TIC' }
      });
    }
    console.log("Paso 5: creando cargo ESPECIALISTA TIC");

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
    console.log("Paso 6: creando personal");

    // 4. Crear el usuario asociado
    const passwordHash = await bcrypt.default.hash(data.password, 10);
    console.log("Paso 7: hasheando password");
    const usuario = await prisma.usuario.create({
      data: {
        username: data.username,
        passwordHash,
        personalId: personal.id,
        empresaId: data.empresaId,
        esSuperUsuario: true,
        esAdmin: true,
        esUsuario: false,
        cesado: false,
        fechaCreacion: new Date(),
        fechaUltimoAcceso: new Date(),
        // Otros campos si tu modelo lo requiere
      }
    });
    console.log("Paso 8: creando usuario");
    return usuario;
  });
};

const contarUsuarios = async () => {
  return await prisma.usuario.count();
};

export default {
  listar,
  obtenerPorId,
  crear,
  actualizar,
  eliminar,
  crearSuperusuarioEnCascada,
  contarUsuarios
};
