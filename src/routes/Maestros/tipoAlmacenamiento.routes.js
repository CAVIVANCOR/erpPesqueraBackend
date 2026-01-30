import { Router } from 'express';
import * as tipoAlmacenamientoController from '../../controllers/Maestros/tipoAlmacenamiento.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoAlmacenamiento
 * Ruta del submódulo: 'tipoAlmacenamiento'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoAlmacenamiento', 'ver'),
  tipoAlmacenamientoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoAlmacenamiento', 'ver'),
  tipoAlmacenamientoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoAlmacenamiento', 'crear'),
  tipoAlmacenamientoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoAlmacenamiento', 'editar'),
  tipoAlmacenamientoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoAlmacenamiento', 'eliminar'),
  tipoAlmacenamientoController.eliminar
);

export default router;