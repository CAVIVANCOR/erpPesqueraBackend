import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Middleware para autenticar usuarios mediante JWT.
 * Si el token es válido, agrega los datos del usuario a req.user.
 * Si no, responde con 401 no autorizado.
 */
export function autenticarJWT(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) {
    return res.status(401).json({ mensaje: 'Token no proporcionado.' });
  }
  const token = authHeader.split(' ')[1];
  if (!token) {
    return res.status(401).json({ mensaje: 'Token no proporcionado.' });
  }
  jwt.verify(token, process.env.JWT_SECRET || 'desarrollo_inseguro', (err, user) => {
    if (err) {
      return res.status(401).json({ mensaje: 'Token inválido o expirado.' });
    }
    req.user = user;
    next();
  });
}

/**
 * Middleware para autorización por rol.
 * Uso: router.get(..., autenticarJWT, autorizarRol(['admin', 'super']))
 * @param {Array<string>} rolesPermitidos - Ej: ['admin', 'super']
 */
export function autorizarRol(rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ mensaje: 'No autenticado.' });
    }
    // Mapear roles desde los flags del usuario
    const rolesUsuario = [];
    if (req.user.esSuperUsuario) rolesUsuario.push('super');
    if (req.user.esAdmin) rolesUsuario.push('admin');
    if (req.user.esUsuario) rolesUsuario.push('usuario');
    // Verificar si tiene al menos uno de los roles requeridos
    const autorizado = rolesPermitidos.some(rol => rolesUsuario.includes(rol));
    if (!autorizado) {
      return res.status(403).json({ mensaje: 'No tiene permisos suficientes.' });
    }
    next();
  };
}
