import { Router } from 'express';
import * as tipoMovimientoAlmacenController from '../../controllers/Almacen/tipoMovimientoAlmacen.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoMovimientoAlmacen
 * Ruta del submódulo: 'tipoMovimientoAlmacen'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoMovimientoAlmacen', 'ver'),
  tipoMovimientoAlmacenController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovimientoAlmacen', 'ver'),
  tipoMovimientoAlmacenController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoMovimientoAlmacen', 'crear'),
  tipoMovimientoAlmacenController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovimientoAlmacen', 'editar'),
  tipoMovimientoAlmacenController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovimientoAlmacen', 'eliminar'),
  tipoMovimientoAlmacenController.eliminar
);

export default router;