import { Router } from 'express';
import * as tipoMaterialController from '../../controllers/Maestros/tipoMaterial.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoMaterial
 * Ruta del submódulo: 'tipoMaterial'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoMaterial', 'ver'),
  tipoMaterialController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMaterial', 'ver'),
  tipoMaterialController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoMaterial', 'crear'),
  tipoMaterialController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMaterial', 'editar'),
  tipoMaterialController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMaterial', 'eliminar'),
  tipoMaterialController.eliminar
);

export default router;