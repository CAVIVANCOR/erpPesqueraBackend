import { Router } from 'express';
import * as centrosAlmacenController from '../../controllers/Almacen/centrosAlmacen.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para CentrosAlmacen
 * Ruta del submódulo: 'centrosAlmacen'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('centrosAlmacen', 'ver'),
  centrosAlmacenController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('centrosAlmacen', 'ver'),
  centrosAlmacenController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('centrosAlmacen', 'crear'),
  centrosAlmacenController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('centrosAlmacen', 'editar'),
  centrosAlmacenController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('centrosAlmacen', 'eliminar'),
  centrosAlmacenController.eliminar
);

export default router;