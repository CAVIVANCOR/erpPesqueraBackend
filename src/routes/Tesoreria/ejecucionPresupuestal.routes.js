import express from 'express';
import ejecucionPresupuestalController from '../../controllers/Tesoreria/ejecucionPresupuestal.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas CRUD para EjecucionPresupuestal
 * Gestiona la ejecución presupuestal
 * Ruta del submódulo: 'ejecucionPresupuestal'
 */

router.get(
  '/',
  autenticarJWT,
  checkPermission('ejecucionPresupuestal', 'ver'),
  ejecucionPresupuestalController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('ejecucionPresupuestal', 'ver'),
  ejecucionPresupuestalController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('ejecucionPresupuestal', 'crear'),
  ejecucionPresupuestalController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('ejecucionPresupuestal', 'editar'),
  ejecucionPresupuestalController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('ejecucionPresupuestal', 'eliminar'),
  ejecucionPresupuestalController.eliminar
);

// Rutas específicas
router.get(
  '/presupuesto/:presupuestoAnualId',
  autenticarJWT,
  checkPermission('ejecucionPresupuestal', 'ver'),
  ejecucionPresupuestalController.listarPorPresupuesto
);

router.get(
  '/periodo/:periodo',
  autenticarJWT,
  checkPermission('ejecucionPresupuestal', 'ver'),
  ejecucionPresupuestalController.listarPorPeriodo
);

export default router;