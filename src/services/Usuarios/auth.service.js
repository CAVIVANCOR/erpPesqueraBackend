import prisma from '../../config/prismaClient.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Servicio de autenticación de usuarios.
 * Incluye funciones para login, registro y generación de JWT.
 * Documentado en español para claridad y mantenibilidad.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'desarrollo_inseguro'; // Cambiar en producción
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const SALT_ROUNDS = 10;

/**
 * Autentica un usuario por username y password.
 * @param {string} username
 * @param {string} password
 * @returns {Promise<{usuario: Object, token: string}>}
 * @throws {NotFoundError|ValidationError}
 */
export async function login(username, password) {
  // Buscar usuario por username
  const usuario = await prisma.usuario.findUnique({ where: { username } });
  if (!usuario || usuario.cesado) throw new NotFoundError('Usuario no encontrado o cesado.');

  // Comparar password con hash almacenado
  const passwordValido = await bcrypt.compare(password, usuario.passwordHash);
  if (!passwordValido) throw new ValidationError('Contraseña incorrecta.');

  // Actualizar fechaUltimoAcceso
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: { fechaUltimoAcceso: new Date() }
  });

  // Generar token JWT con los datos esenciales y roles
  const payload = {
    id: usuario.id.toString(),
    username: usuario.username,
    esSuperUsuario: usuario.esSuperUsuario,
    esAdmin: usuario.esAdmin,
    esUsuario: usuario.esUsuario,
    empresaId: usuario.empresaId.toString()
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

  // Construir el objeto usuario para respuesta, convirtiendo BigInt a string
  const usuarioRespuesta = {
    ...usuario,
    id: usuario.id.toString(),
    empresaId: usuario.empresaId.toString(),
    personalId: usuario.personalId ? usuario.personalId.toString() : null,
    fechaCreacion: usuario.fechaCreacion ? usuario.fechaCreacion.toISOString() : null,
    fechaUltimoAcceso: usuario.fechaUltimoAcceso ? usuario.fechaUltimoAcceso.toISOString() : null
  };
  delete usuarioRespuesta.passwordHash;

  return { usuario: usuarioRespuesta, token };
}

/**
 * Registra un nuevo usuario, hasheando la contraseña.
 * @param {Object} data - Debe incluir username y password (en texto plano)
 * @returns {Promise<Object>} El usuario creado
 * @throws {ConflictError|ValidationError}
 */
export async function register(data) {
  // Validar presencia de username y password
  if (!data.username || !data.password) {
    throw new ValidationError('Username y password son obligatorios.');
  }
  // Validar unicidad de username
  const existe = await prisma.usuario.findUnique({ where: { username: data.username } });
  if (existe) throw new ConflictError('Ya existe un usuario con ese username.');

  // Hashear la contraseña
  const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Crear el usuario (otros campos pueden venir en data)
  const usuario = await prisma.usuario.create({
    data: { ...data, passwordHash, password: undefined }
  });
  return usuario;
}
