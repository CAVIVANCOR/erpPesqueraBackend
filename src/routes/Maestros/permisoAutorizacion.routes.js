import { Router } from 'express';
import * as permisoAutorizacionController from '../../controllers/Maestros/permisoAutorizacion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para PermisoAutorizacion
 * Ruta del submódulo: 'permisoAutorizacion'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('permisoAutorizacion', 'ver'),
  permisoAutorizacionController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('permisoAutorizacion', 'ver'),
  permisoAutorizacionController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('permisoAutorizacion', 'crear'),
  permisoAutorizacionController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('permisoAutorizacion', 'editar'),
  permisoAutorizacionController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('permisoAutorizacion', 'eliminar'),
  permisoAutorizacionController.eliminar
);

export default router;