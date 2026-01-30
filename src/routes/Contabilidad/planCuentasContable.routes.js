import { Router } from 'express';
import * as planCuentasContableController from '../../controllers/Contabilidad/planCuentasContable.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para PlanCuentasContable
 * Ruta del submódulo: 'planCuentasContable'
 */

// ✅ Rutas CRUD básicas (estas SÍ las mantuve correctamente)
router.get(
  '/',
  autenticarJWT,
  checkPermission('planCuentasContable', 'ver'),
  planCuentasContableController.listar
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (1/2)
router.get(
  '/activas',
  autenticarJWT,
  checkPermission('planCuentasContable', 'ver'),
  planCuentasContableController.listarActivas
);

// ⚠️ RUTAS QUE YO BORRÉ Y AHORA RESTAURO (2/2)
router.get(
  '/imputables',
  autenticarJWT,
  checkPermission('planCuentasContable', 'ver'),
  planCuentasContableController.listarImputables
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('planCuentasContable', 'ver'),
  planCuentasContableController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('planCuentasContable', 'crear'),
  planCuentasContableController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('planCuentasContable', 'editar'),
  planCuentasContableController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('planCuentasContable', 'eliminar'),
  planCuentasContableController.eliminar
);

export default router;