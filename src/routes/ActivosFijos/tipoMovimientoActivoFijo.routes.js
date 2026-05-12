import { Router } from 'express';
import * as tipoMovimientoActivoFijoController from '../../controllers/ActivosFijos/tipoMovimientoActivoFijo.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoMovimientoActivoFijo
 * Ruta del submódulo: 'tipoMovimientoActivoFijo'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoMovimientoActivoFijo', 'ver'),
  tipoMovimientoActivoFijoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovimientoActivoFijo', 'ver'),
  tipoMovimientoActivoFijoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoMovimientoActivoFijo', 'crear'),
  tipoMovimientoActivoFijoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovimientoActivoFijo', 'editar'),
  tipoMovimientoActivoFijoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovimientoActivoFijo', 'eliminar'),
  tipoMovimientoActivoFijoController.eliminar
);

export default router;