import { Router } from 'express';
import * as subfamiliaProductoController from '../../controllers/Maestros/subfamiliaProducto.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para SubfamiliaProducto
 * Ruta del submódulo: 'subfamiliaProducto'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('subfamiliaProducto', 'ver'),
  subfamiliaProductoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('subfamiliaProducto', 'ver'),
  subfamiliaProductoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('subfamiliaProducto', 'crear'),
  subfamiliaProductoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('subfamiliaProducto', 'editar'),
  subfamiliaProductoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('subfamiliaProducto', 'eliminar'),
  subfamiliaProductoController.eliminar
);

export default router;