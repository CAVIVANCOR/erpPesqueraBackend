import { Router } from 'express';
import * as centroCostoController from '../../controllers/Maestros/centroCosto.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para CentroCosto
 * Ruta del submódulo: 'centroCosto'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('centroCosto', 'ver'),
  centroCostoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('centroCosto', 'ver'),
  centroCostoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('centroCosto', 'crear'),
  centroCostoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('centroCosto', 'editar'),
  centroCostoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('centroCosto', 'eliminar'),
  centroCostoController.eliminar
);

export default router;