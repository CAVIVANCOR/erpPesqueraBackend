import express from 'express';
import presupuestoAnualController from '../../controllers/Tesoreria/presupuestoAnual.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas CRUD para PresupuestoAnual
 * Gestiona los presupuestos anuales
 * Ruta del submódulo: 'presupuestoAnual'
 */

router.get(
  '/',
  autenticarJWT,
  checkPermission('presupuestoAnual', 'ver'),
  presupuestoAnualController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('presupuestoAnual', 'ver'),
  presupuestoAnualController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('presupuestoAnual', 'crear'),
  presupuestoAnualController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('presupuestoAnual', 'editar'),
  presupuestoAnualController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('presupuestoAnual', 'eliminar'),
  presupuestoAnualController.eliminar
);

// Rutas específicas
router.get(
  '/empresa/:empresaId',
  autenticarJWT,
  checkPermission('presupuestoAnual', 'ver'),
  presupuestoAnualController.listarPorEmpresa
);

router.get(
  '/empresa/:empresaId/anio/:anio',
  autenticarJWT,
  checkPermission('presupuestoAnual', 'ver'),
  presupuestoAnualController.obtenerPorEmpresaAnio
);

export default router;