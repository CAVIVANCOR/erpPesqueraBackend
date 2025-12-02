import prisma from '../../config/prismaClient.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { NotFoundError, ValidationError, ConflictError } from '../../utils/errors.js';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Servicio de autenticación de usuarios.
 * Incluye funciones para login, registro y generación de JWT.
 * Documentado en español para claridad y mantenibilidad.
 */

const JWT_SECRET = process.env.JWT_SECRET || 'desarrollo_inseguro';
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
  // Buscar usuario por username, incluyendo datos del personal (foto, nombres, apellidos)
  const usuario = await prisma.usuario.findUnique({ 
    where: { username },
    include: {
      personal: {
        select: {
          id: true,
          nombres: true,
          apellidos: true,
          urlFotoPersona: true
        }
      }
    }
  });
  
  
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
  
  try {
    // Construir URL completa de la foto si existe
    const fotoUrl = usuario.personal?.urlFotoPersona 
      ? `${process.env.API_URL || 'http://localhost:3000'}/public/personal/${usuario.personal.urlFotoPersona}`
      : null;

    const usuarioRespuesta = {
      ...usuario,
      id: usuario.id.toString(),
      empresaId: usuario.empresaId.toString(),
      personalId: usuario.personalId ? usuario.personalId.toString() : null,
      fechaCreacion: usuario.fechaCreacion ? usuario.fechaCreacion.toISOString() : null,
      fechaUltimoAcceso: usuario.fechaUltimoAcceso ? usuario.fechaUltimoAcceso.toISOString() : null,
      // Convertir el objeto personal si existe
      personal: usuario.personal ? {
        id: usuario.personal.id.toString(),
        nombres: usuario.personal.nombres,
        apellidos: usuario.personal.apellidos,
        fotoUrl: fotoUrl
      } : null
    };
    delete usuarioRespuesta.passwordHash;

    // Generar refresh token seguro y persistente
    const refreshToken = await crearRefreshToken(usuario.id);
    return { usuario: usuarioRespuesta, token, refreshToken: refreshToken.token };
    
  } catch (error) {
    console.error('❌ [LOGIN] Error al construir respuesta:', error);
    throw error;
  }
}

/**
 * Genera un refresh token seguro, lo almacena en la BD y lo asocia al usuario.
 * @param {BigInt} usuarioId - ID del usuario dueño del token
 * @param {number} expiracionMinutos - Tiempo de vida en minutos (por defecto 30 días)
 * @returns {Promise<Object>} El refresh token creado
 */
export async function crearRefreshToken(usuarioId, expiracionMinutos = 43200) {
  const token = crypto.randomBytes(40).toString('hex');
  const expiracion = new Date(Date.now() + expiracionMinutos * 60 * 1000);
  const refreshToken = await prisma.refreshToken.create({
    data: {
      token,
      usuarioId,
      expiracion
    }
  });
  return refreshToken;
}

/**
 * Refresca el access token usando un refresh token válido.
 * @param {string} refreshTokenString
 * @returns {Promise<{token: string}>}
 * @throws {ValidationError} Si el refresh token es inválido, revocado o expirado
 */
export async function refrescarAccessToken(refreshTokenString) {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token: refreshTokenString },
    include: { usuario: true }
  });
  if (!refreshToken || refreshToken.revocado || refreshToken.expiracion < new Date()) {
    throw new ValidationError('Refresh token inválido o expirado.');
  }
  const usuario = refreshToken.usuario;
  const payload = {
    id: usuario.id.toString(),
    username: usuario.username,
    esSuperUsuario: usuario.esSuperUsuario,
    esAdmin: usuario.esAdmin,
    esUsuario: usuario.esUsuario,
    empresaId: usuario.empresaId.toString()
  };
  const nuevoToken = jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  return { token: nuevoToken };
}

/**
 * Revoca un refresh token (logout seguro).
 * @param {string} refreshTokenString
 * @returns {Promise<void>}
 */
export async function logout(refreshTokenString) {
  await prisma.refreshToken.updateMany({
    where: { token: refreshTokenString },
    data: { revocado: true }
  });
}

/**
 * Registra un nuevo usuario.
 * @param {Object} data - Datos del usuario (username, password, etc.)
 * @returns {Promise<Object>} Usuario creado (sin passwordHash)
 * @throws {ConflictError} Si el username ya existe
 */
export async function register(data) {
  const { username, password, ...resto } = data;
  const existente = await prisma.usuario.findUnique({ where: { username } });
  if (existente) throw new ConflictError('El username ya existe.');
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const usuario = await prisma.usuario.create({
    data: { username, passwordHash, ...resto }
  });
  const { passwordHash: _, ...usuarioSinPassword } = usuario;
  return usuarioSinPassword;
}