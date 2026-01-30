import { Router } from 'express';
import * as motivoAccesoController from '../../controllers/AccesoInstalaciones/motivoAcceso.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para MotivoAcceso
 * Ruta del submódulo: 'motivoAcceso'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('motivoAcceso', 'ver'),
  motivoAccesoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('motivoAcceso', 'ver'),
  motivoAccesoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('motivoAcceso', 'crear'),
  motivoAccesoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('motivoAcceso', 'editar'),
  motivoAccesoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('motivoAcceso', 'eliminar'),
  motivoAccesoController.eliminar
);

export default router;