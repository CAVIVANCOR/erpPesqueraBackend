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

/**
 * Middleware para verificar acceso a un submódulo específico con permisos granulares
 * Uso: router.post(..., autenticarJWT, verificarAccesoSubmodulo(5, 'crear'))
 * @param {number} submoduloId - ID del submódulo
 * @param {string} permiso - Tipo de permiso: 'ver', 'crear', 'editar', 'eliminar', 'aprobar', 'rechazar', 'reactivar'
 */
export function verificarAccesoSubmodulo(submoduloId, permiso = 'ver') {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ mensaje: 'No autenticado.' });
      }

      const usuarioId = BigInt(req.user.id);
      
      // Importar dinámicamente el servicio
      const { default: usuarioService } = await import('../services/Usuarios/usuario.service.js');
      
      // Verificar si el usuario puede acceder al sistema
      const puedeAcceder = await usuarioService.puedeAcceder(usuarioId);
      if (!puedeAcceder) {
        return res.status(403).json({ 
          mensaje: 'Usuario inactivo, bloqueado o cesado.' 
        });
      }
      
      // Verificar permiso específico
      const tienePermiso = await usuarioService.verificarPermiso(
        usuarioId,
        BigInt(submoduloId),
        permiso
      );
      
      if (!tienePermiso) {
        return res.status(403).json({
          mensaje: `No tienes permiso para ${permiso} en este módulo.`
        });
      }
      
      next();
    } catch (err) {
      console.error('Error en verificación de acceso:', err);
      return res.status(500).json({ 
        mensaje: 'Error al verificar permisos.' 
      });
    }
  };
}

/**
 * Middleware para verificar que el usuario esté activo y pueda acceder
 * Uso: router.get(..., autenticarJWT, verificarUsuarioActivo)
 */
export async function verificarUsuarioActivo(req, res, next) {
  try {
    if (!req.user) {
      return res.status(401).json({ mensaje: 'No autenticado.' });
    }

    const usuarioId = BigInt(req.user.id);
    
    const { default: usuarioService } = await import('../services/Usuarios/usuario.service.js');
    
    const puedeAcceder = await usuarioService.puedeAcceder(usuarioId);
    if (!puedeAcceder) {
      return res.status(403).json({ 
        mensaje: 'Usuario inactivo, bloqueado o cesado.' 
      });
    }
    
    next();
  } catch (err) {
    console.error('Error en verificación de usuario activo:', err);
    return res.status(500).json({ 
      mensaje: 'Error al verificar estado del usuario.' 
    });
  }
}
