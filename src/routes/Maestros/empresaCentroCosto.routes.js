import { Router } from 'express';
import * as empresaCentroCostoController from '../../controllers/Maestros/empresaCentroCosto.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para EmpresaCentroCosto
 * Ruta del submódulo: 'empresaCentroCosto'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('empresaCentroCosto', 'ver'),
  empresaCentroCostoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('empresaCentroCosto', 'ver'),
  empresaCentroCostoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('empresaCentroCosto', 'crear'),
  empresaCentroCostoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('empresaCentroCosto', 'editar'),
  empresaCentroCostoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('empresaCentroCosto', 'eliminar'),
  empresaCentroCostoController.eliminar
);

export default router;