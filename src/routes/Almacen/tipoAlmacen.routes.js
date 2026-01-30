import { Router } from 'express';
import * as tipoAlmacenController from '../../controllers/Almacen/tipoAlmacen.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoAlmacen
 * Ruta del submódulo: 'tipoAlmacen'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoAlmacen', 'ver'),
  tipoAlmacenController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoAlmacen', 'ver'),
  tipoAlmacenController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoAlmacen', 'crear'),
  tipoAlmacenController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoAlmacen', 'editar'),
  tipoAlmacenController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoAlmacen', 'eliminar'),
  tipoAlmacenController.eliminar
);

export default router;