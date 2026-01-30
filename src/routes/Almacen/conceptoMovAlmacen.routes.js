import { Router } from 'express';
import * as conceptoMovAlmacenController from '../../controllers/Almacen/conceptoMovAlmacen.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para ConceptoMovAlmacen
 * Ruta del submódulo: 'conceptoMovAlmacen'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('conceptoMovAlmacen', 'ver'),
  conceptoMovAlmacenController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('conceptoMovAlmacen', 'ver'),
  conceptoMovAlmacenController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('conceptoMovAlmacen', 'crear'),
  conceptoMovAlmacenController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('conceptoMovAlmacen', 'editar'),
  conceptoMovAlmacenController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('conceptoMovAlmacen', 'eliminar'),
  conceptoMovAlmacenController.eliminar
);

export default router;