import { Router } from 'express';
import * as tipoActivoController from '../../controllers/Maestros/tipoActivo.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoActivo
 * Ruta del submódulo: 'tipoActivo'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoActivo', 'ver'),
  tipoActivoController.listar
);

router.get(
  '/activos/lista', 
  autenticarJWT, 
  checkPermission('tipoActivo', 'ver'),
  tipoActivoController.listarActivos
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoActivo', 'ver'),
  tipoActivoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoActivo', 'crear'),
  tipoActivoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoActivo', 'editar'),
  tipoActivoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoActivo', 'eliminar'),
  tipoActivoController.eliminar
);

export default router;