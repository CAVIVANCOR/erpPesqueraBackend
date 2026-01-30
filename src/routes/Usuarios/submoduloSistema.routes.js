import { Router } from 'express';
import * as submoduloSistemaController from '../../controllers/Usuarios/submoduloSistema.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para SubmoduloSistema
 * Ruta del submódulo: 'SubmodulosSistema'
 */

// ✅ Rutas CRUD básicas (estas SÍ las mantuve correctamente)
router.get(
  '/',
  autenticarJWT,
  checkPermission('SubmodulosSistema', 'ver'),
  submoduloSistemaController.listar
);

// ⚠️ RUTA QUE YO BORRÉ Y AHORA RESTAURO (1/1)
router.get(
  '/modulo/:moduloId',
  autenticarJWT,
  checkPermission('SubmodulosSistema', 'ver'),
  submoduloSistemaController.obtenerPorModulo
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('SubmodulosSistema', 'ver'),
  submoduloSistemaController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('SubmodulosSistema', 'crear'),
  submoduloSistemaController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('SubmodulosSistema', 'editar'),
  submoduloSistemaController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('SubmodulosSistema', 'eliminar'),
  submoduloSistemaController.eliminar
);

export default router;