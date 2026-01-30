import { Router } from 'express';
import * as cargosPersonalController from '../../controllers/Usuarios/cargosPersonal.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para CargosPersonal
 * Ruta del submódulo: 'cargosPersonal'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('cargosPersonal', 'ver'),
  cargosPersonalController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('cargosPersonal', 'ver'),
  cargosPersonalController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('cargosPersonal', 'crear'),
  cargosPersonalController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('cargosPersonal', 'editar'),
  cargosPersonalController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('cargosPersonal', 'eliminar'),
  cargosPersonalController.eliminar
);

export default router;