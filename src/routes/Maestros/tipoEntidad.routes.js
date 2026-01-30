import { Router } from 'express';
import * as tipoEntidadController from '../../controllers/Maestros/tipoEntidad.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoEntidad
 * Ruta del submódulo: 'tipoEntidad'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoEntidad', 'ver'),
  tipoEntidadController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoEntidad', 'ver'),
  tipoEntidadController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoEntidad', 'crear'),
  tipoEntidadController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoEntidad', 'editar'),
  tipoEntidadController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoEntidad', 'eliminar'),
  tipoEntidadController.eliminar
);

export default router;