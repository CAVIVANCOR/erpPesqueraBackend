import { Router } from 'express';
import * as tipoAccesoInstalacionController from '../../controllers/AccesoInstalaciones/tipoAccesoInstalacion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoAccesoInstalacion
 * Ruta del submódulo: 'tipoAccesoInstalacion'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoAccesoInstalacion', 'ver'),
  tipoAccesoInstalacionController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoAccesoInstalacion', 'ver'),
  tipoAccesoInstalacionController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoAccesoInstalacion', 'crear'),
  tipoAccesoInstalacionController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoAccesoInstalacion', 'editar'),
  tipoAccesoInstalacionController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoAccesoInstalacion', 'eliminar'),
  tipoAccesoInstalacionController.eliminar
);

export default router;