import * as authService from '../../services/Usuarios/auth.service.js';
import toJSONBigInt from '../../utils/toJSONBigInt.js';

/**
 * Endpoint para refrescar el access token usando un refresh token válido.
 * POST /api/auth/refresh
 * @param {Object} req - Debe incluir { refreshToken } en el body
 * @param {Object} res
 * @param {Function} next
 */
export async function refreshToken(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token requerido.' });
    const nuevoToken = await authService.refrescarAccessToken(refreshToken);
    res.json(nuevoToken);
  } catch (err) {
    next(err);
  }
}

/**
 * Endpoint para cierre de sesión seguro (revoca refresh token).
 * POST /api/auth/logout
 * @param {Object} req - Debe incluir { refreshToken } en el body
 * @param {Object} res
 * @param {Function} next
 */
export async function logout(req, res, next) {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) return res.status(400).json({ error: 'Refresh token requerido.' });
    await authService.logout(refreshToken);
    res.json({ mensaje: 'Sesión cerrada correctamente.' });
  } catch (err) {
    next(err);
  }
}

/**
 * Controlador para autenticación de usuarios.
 * Maneja login y registro, devolviendo tokens JWT y mensajes claros.
 * Documentado en español para claridad y mantenibilidad.
 */

/**
 * Endpoint de login.
 * POST /api/auth/login
 */
/**
 * Endpoint de login.
 * POST /api/auth/login
 *
 * Retorna:
 * {
 *   usuario: { ... },
 *   token: "...",
 *   refreshToken: "..."
 * }
 *
 * Es fundamental NO filtrar ni modificar el objeto retornado por el servicio,
 * para asegurar compatibilidad con el frontend y futuras ampliaciones.
 */
export async function login(req, res, next) {
  try {
    const { username, password } = req.body;
    // El servicio ya retorna { usuario, token, refreshToken }
    const result = await authService.login(username, password);
    // Convierte solo el usuario a JSON compatible (BigInt a string)
    result.usuario = toJSONBigInt(result.usuario);
    res.json(result);
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
