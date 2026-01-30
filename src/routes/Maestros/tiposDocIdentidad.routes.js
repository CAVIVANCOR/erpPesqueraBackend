import { Router } from 'express';
import * as tiposDocIdentidadController from '../../controllers/Maestros/tiposDocIdentidad.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TiposDocIdentidad
 * Ruta del submódulo: 'tiposDocIdentidad'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tiposDocIdentidad', 'ver'),
  tiposDocIdentidadController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tiposDocIdentidad', 'ver'),
  tiposDocIdentidadController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tiposDocIdentidad', 'crear'),
  tiposDocIdentidadController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tiposDocIdentidad', 'editar'),
  tiposDocIdentidadController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tiposDocIdentidad', 'eliminar'),
  tiposDocIdentidadController.eliminar
);

export default router;