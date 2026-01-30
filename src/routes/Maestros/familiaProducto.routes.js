import { Router } from 'express';
import * as familiaProductoController from '../../controllers/Maestros/familiaProducto.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para FamiliaProducto
 * Ruta del submódulo: 'familiaProducto'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('familiaProducto', 'ver'),
  familiaProductoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('familiaProducto', 'ver'),
  familiaProductoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('familiaProducto', 'crear'),
  familiaProductoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('familiaProducto', 'editar'),
  familiaProductoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('familiaProducto', 'eliminar'),
  familiaProductoController.eliminar
);

export default router;