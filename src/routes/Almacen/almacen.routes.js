import { Router } from 'express';
import * as almacenController from '../../controllers/Almacen/almacen.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para Almacen
 * Ruta del submódulo: 'almacen'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('almacen', 'ver'),
  almacenController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('almacen', 'ver'),
  almacenController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('almacen', 'crear'),
  almacenController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('almacen', 'editar'),
  almacenController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('almacen', 'eliminar'),
  almacenController.eliminar
);

export default router;