import { Router } from 'express';
import * as movimientoActivoFijoController from '../../controllers/ActivosFijos/movimientoActivoFijo.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para MovimientoActivoFijo
 * Ruta del submódulo: 'movActivoFijo'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('movActivoFijo', 'ver'),
  movimientoActivoFijoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('movActivoFijo', 'ver'),
  movimientoActivoFijoController.obtenerPorId
);

router.get(
  '/activo/:activoId', 
  autenticarJWT, 
  checkPermission('movActivoFijo', 'ver'),
  movimientoActivoFijoController.listarPorActivo
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('movActivoFijo', 'crear'),
  movimientoActivoFijoController.crear
);

router.post(
  '/:id/generar-borrador-asiento',
  autenticarJWT,
  checkPermission('movActivoFijo', 'ver'),
  movimientoActivoFijoController.generarBorradorAsiento
);

router.post(
  '/:id/guardar-asiento',
  autenticarJWT,
  checkPermission('movActivoFijo', 'crear'),
  movimientoActivoFijoController.guardarAsientoContable
);
router.put(
  '/:id/guardar-asiento',
  autenticarJWT,
  checkPermission('movActivoFijo', 'editar'),
  movimientoActivoFijoController.guardarAsientoContable
);
router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('movActivoFijo', 'editar'),
  movimientoActivoFijoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('movActivoFijo', 'eliminar'),
  movimientoActivoFijoController.eliminar
);

// Eliminar asiento contable de un movimiento
router.delete(
  "/:id/asiento-contable/:asientoId",
  autenticarJWT,
  checkPermission('movActivoFijo', 'eliminar'),
  movimientoActivoFijoController.eliminarAsientoContable
);

export default router;