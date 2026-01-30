// Rutas de Express para AsientoContableInterfaz
import { Router } from 'express';
import * as controller from '../../controllers/FlujoCaja/asientoContableInterfaz.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para AsientoContableInterfaz
 * Ruta del submódulo: 'asientoContableInterfaz'
 */

// ✅ Rutas CRUD básicas (estas SÍ las mantuve correctamente)
router.get(
  '/',
  autenticarJWT,
  checkPermission('asientoContableInterfaz', 'ver'),
  controller.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('asientoContableInterfaz', 'ver'),
  controller.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('asientoContableInterfaz', 'crear'),
  controller.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('asientoContableInterfaz', 'editar'),
  controller.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('asientoContableInterfaz', 'eliminar'),
  controller.eliminar
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (1/2)
router.post(
  '/:id/enviar',
  autenticarJWT,
  checkPermission('asientoContableInterfaz', 'editar'),
  controller.enviar
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (2/2)
router.post(
  '/:id/registrar-error',
  autenticarJWT,
  checkPermission('asientoContableInterfaz', 'editar'),
  controller.registrarError
);

export default router;