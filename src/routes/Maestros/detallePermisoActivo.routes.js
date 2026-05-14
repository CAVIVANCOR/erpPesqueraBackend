import { Router } from 'express';
import * as detallePermisoActivoController from '../../controllers/Maestros/detallePermisoActivo.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para DetallePermisoActivo
 * Ruta del submódulo: 'detallePermisoActivo'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('detallePermisoActivo', 'ver'),
  detallePermisoActivoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('detallePermisoActivo', 'ver'),
  detallePermisoActivoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('detallePermisoActivo', 'crear'),
  detallePermisoActivoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('detallePermisoActivo', 'editar'),
  detallePermisoActivoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('detallePermisoActivo', 'eliminar'),
  detallePermisoActivoController.eliminar
);

export default router;