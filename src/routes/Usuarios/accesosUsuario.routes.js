import { Router } from 'express';
import * as accesosUsuarioController from '../../controllers/Usuarios/accesosUsuario.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para AccesosUsuario
 * Ruta del submódulo: 'accesosUsuario' (sin guión)
 */

// ✅ Rutas CRUD básicas (estas SÍ las mantuve correctamente)
router.get(
  '/',
  autenticarJWT,
  checkPermission('accesosUsuario', 'ver'),
  accesosUsuarioController.listar
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (1/3)
router.get(
  '/usuario/:usuarioId',
  autenticarJWT,
  checkPermission('accesosUsuario', 'ver'),
  accesosUsuarioController.obtenerPorUsuario
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('accesosUsuario', 'ver'),
  accesosUsuarioController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('accesosUsuario', 'crear'),
  accesosUsuarioController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('accesosUsuario', 'editar'),
  accesosUsuarioController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('accesosUsuario', 'eliminar'),
  accesosUsuarioController.eliminar
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (2/3)
router.post(
  '/asignar-lote',
  autenticarJWT,
  checkPermission('accesosUsuario', 'crear'),
  accesosUsuarioController.asignarAccesosEnLote
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (3/3)
router.post(
  '/revocar-lote',
  autenticarJWT,
  checkPermission('accesosUsuario', 'eliminar'),
  accesosUsuarioController.revocarAccesosEnLote
);

export default router;