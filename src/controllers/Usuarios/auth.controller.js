import * as authService from '../../services/Usuarios/auth.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Controlador para autenticación de usuarios.
 * Maneja login y registro, devolviendo tokens JWT y mensajes claros.
 * Documentado en español para claridad y mantenibilidad.
 */

/**
 * Endpoint de login.
 * POST /api/auth/login
 */
export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    const { usuario, token } = await authService.login(username, password);
    res.json({ usuario: toJSONBigInt(usuario), token });
  } catch (err) {
    next(err);
  }
}

/**
 * Endpoint de registro de usuario.
 * POST /api/auth/register
 */
export async function register(req, res, next) {
  try {
    const usuario = await authService.register(req.body);
    res.status(201).json({ usuario: toJSONBigInt(usuario) });
  } catch (err) {
    next(err);
  }
}
