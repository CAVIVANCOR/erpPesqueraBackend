import { Router } from 'express';
import * as usuarioController from '../../controllers/Usuarios/usuario.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para Usuario
 * Ruta del submódulo: 'usuarios'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('usuarios', 'ver'),
  usuarioController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('usuarios', 'ver'),
  usuarioController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('usuarios', 'crear'),
  usuarioController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('usuarios', 'editar'),
  usuarioController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('usuarios', 'eliminar'),
  usuarioController.eliminar
);

router.post(
  '/superusuario', 
  autenticarJWT, 
  checkPermission('usuarios', 'crear'),
  usuarioController.crearSuperusuario
);

router.get(
  '/count', 
  autenticarJWT, 
  checkPermission('usuarios', 'ver'),
  usuarioController.contarUsuarios
);

export default router;