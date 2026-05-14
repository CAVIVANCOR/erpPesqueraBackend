import { Router } from 'express';
import * as tipoMovimientoActivoFijoController from '../../controllers/ActivosFijos/tipoMovimientoActivoFijo.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoMovimientoActivoFijo
 * Ruta del submódulo: 'tipoMovActivo'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoMovActivo', 'ver'),
  tipoMovimientoActivoFijoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovActivo', 'ver'),
  tipoMovimientoActivoFijoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoMovActivo', 'crear'),
  tipoMovimientoActivoFijoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovActivo', 'editar'),
  tipoMovimientoActivoFijoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovActivo', 'eliminar'),
  tipoMovimientoActivoFijoController.eliminar
);

export default router;