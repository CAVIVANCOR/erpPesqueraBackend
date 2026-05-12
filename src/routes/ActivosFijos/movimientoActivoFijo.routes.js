import { Router } from 'express';
import * as movimientoActivoFijoController from '../../controllers/ActivosFijos/movimientoActivoFijo.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para MovimientoActivoFijo
 * Ruta del submódulo: 'movimientoActivoFijo'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('movimientoActivoFijo', 'ver'),
  movimientoActivoFijoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('movimientoActivoFijo', 'ver'),
  movimientoActivoFijoController.obtenerPorId
);

router.get(
  '/activo/:activoId', 
  autenticarJWT, 
  checkPermission('movimientoActivoFijo', 'ver'),
  movimientoActivoFijoController.listarPorActivo
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('movimientoActivoFijo', 'crear'),
  movimientoActivoFijoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('movimientoActivoFijo', 'editar'),
  movimientoActivoFijoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('movimientoActivoFijo', 'eliminar'),
  movimientoActivoFijoController.eliminar
);

export default router;