import prisma from '../config/prismaClient.js';
import { ForbiddenError } from '../utils/errors.js';

/**
 * Middleware genérico para verificar permisos de acceso a submódulos
 * Valida que el usuario tenga el permiso específico para la acción solicitada
 * Los superusuarios tienen acceso total automáticamente
 * 
 * @param {string} ruta - Ruta del submódulo (ej: 'usuarios', 'personal', 'accesosUsuario')
 * @param {string} accion - Acción requerida: 'ver', 'crear', 'editar', 'eliminar', 'aprobar', 'rechazar', 'reactivar'
 * @returns {Function} Middleware de Express
 * 
 * @example
 * router.get('/', authenticate, checkPermission('usuarios', 'ver'), listarUsuarios);
 * router.post('/', authenticate, checkPermission('usuarios', 'crear'), crearUsuario);
 */
export const checkPermission = (ruta, accion) => {
  return async (req, res, next) => {
    try {
      const usuarioId = req.usuario?.id; // Del middleware de autenticación JWT
      
      if (!usuarioId) {
        throw new ForbiddenError('Usuario no autenticado');
      }

      // Superusuarios tienen acceso total a todo
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { esSuperUsuario: true }
      });

      if (usuario?.esSuperUsuario) {
        req.acceso = { esSuperUsuario: true, accesoCompleto: true };
        return next();
      }

      // Buscar el submódulo por ruta
      const submodulo = await prisma.submoduloSistema.findFirst({
        where: { 
          ruta, 
          activo: true 
        },
        select: { id: true, nombre: true }
      });

      if (!submodulo) {
        throw new ForbiddenError(`Submódulo '${ruta}' no encontrado o inactivo`);
      }

      // Buscar acceso activo del usuario al submódulo
      const acceso = await prisma.accesosUsuario.findFirst({
        where: {
          usuarioId,
          submoduloId: submodulo.id,
          activo: true
        },
        select: {
          id: true,
          puedeVer: true,
          puedeCrear: true,
          puedeEditar: true,
          puedeEliminar: true,
          puedeAprobarDocs: true,
          puedeRechazarDocs: true,
          puedeReactivarDocs: true
        }
      });

      if (!acceso) {
        throw new ForbiddenError(`No tiene acceso al módulo '${submodulo.nombre}'`);
      }

      // Mapeo de acciones a permisos
      const mapaPermisos = {
        'ver': acceso.puedeVer,
        'crear': acceso.puedeCrear,
        'editar': acceso.puedeEditar,
        'eliminar': acceso.puedeEliminar,
        'aprobar': acceso.puedeAprobarDocs,
        'rechazar': acceso.puedeRechazarDocs,
        'reactivar': acceso.puedeReactivarDocs
      };

      // Validar que la acción sea válida
      if (!(accion in mapaPermisos)) {
        throw new ForbiddenError(`Acción '${accion}' no válida`);
      }

      // Validar el permiso específico
      if (!mapaPermisos[accion]) {
        throw new ForbiddenError(`No tiene permiso para ${accion} en el módulo '${submodulo.nombre}'`);
      }

      // Adjuntar acceso completo al request para uso posterior si es necesario
      req.acceso = acceso;
      req.submodulo = submodulo;
      
      next();
    } catch (err) {
      next(err);
    }
  };
};

/**
 * Middleware simplificado que solo verifica si el usuario tiene acceso al módulo
 * Sin validar permisos específicos (útil para endpoints de solo lectura básica)
 * 
 * @param {string} ruta - Ruta del submódulo
 * @returns {Function} Middleware de Express
 */
export const checkAccess = (ruta) => {
  return async (req, res, next) => {
    try {
      const usuarioId = req.usuario?.id;
      
      if (!usuarioId) {
        throw new ForbiddenError('Usuario no autenticado');
      }

      // Superusuarios tienen acceso total
      const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { esSuperUsuario: true }
      });

      if (usuario?.esSuperUsuario) {
        req.acceso = { esSuperUsuario: true, accesoCompleto: true };
        return next();
      }

      // Buscar el submódulo
      const submodulo = await prisma.submoduloSistema.findFirst({
        where: { ruta, activo: true },
        select: { id: true, nombre: true }
      });

      if (!submodulo) {
        throw new ForbiddenError(`Submódulo '${ruta}' no encontrado`);
      }

      // Verificar que tenga algún acceso activo
      const acceso = await prisma.accesosUsuario.findFirst({
        where: {
          usuarioId,
          submoduloId: submodulo.id,
          activo: true
        }
      });

      if (!acceso) {
        throw new ForbiddenError(`No tiene acceso al módulo '${submodulo.nombre}'`);
      }

      req.acceso = acceso;
      req.submodulo = submodulo;
      
      next();
    } catch (err) {
      next(err);
    }
  };
};