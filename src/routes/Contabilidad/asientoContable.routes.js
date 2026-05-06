import { Router } from 'express';
import * as asientoContableController from '../../controllers/Contabilidad/asientoContable.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas para AsientoContable
 * Ruta del submódulo: 'asientoContable'
 */

// Rutas CRUD básicas
router.get(
  '/', 
  autenticarJWT, 
  checkPermission('asientoContable', 'ver'),
  asientoContableController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('asientoContable', 'ver'),
  asientoContableController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('asientoContable', 'crear'),
  asientoContableController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('asientoContable', 'editar'),
  asientoContableController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('asientoContable', 'eliminar'),
  asientoContableController.eliminar
);

// Rutas específicas por empresa y período
router.get(
  '/empresa/:empresaId', 
  autenticarJWT, 
  checkPermission('asientoContable', 'ver'),
  asientoContableController.listarPorEmpresa
);

router.get(
  '/periodo/:periodoContableId', 
  autenticarJWT, 
  checkPermission('asientoContable', 'ver'),
  asientoContableController.listarPorPeriodo
);

// Ruta para obtener asientos por movimiento de caja
router.get(
  '/por-movimiento/:movimientoCajaId', 
  autenticarJWT, 
  checkPermission('asientoContable', 'ver'),
  asientoContableController.listarPorMovimiento
);

// Rutas de gestión de asientos
router.post(
  '/:id/aprobar', 
  autenticarJWT, 
  checkPermission('asientoContable', 'aprobar'),
  asientoContableController.aprobarAsiento
);

router.post(
  '/:id/anular', 
  autenticarJWT, 
  checkPermission('asientoContable', 'eliminar'),
  asientoContableController.anularAsiento
);


// Ruta para unir múltiples asientos en uno solo
router.post(
  '/unir', 
  autenticarJWT, 
  checkPermission('asientoContable', 'editar'),
  asientoContableController.unirAsientos
);

export default router;