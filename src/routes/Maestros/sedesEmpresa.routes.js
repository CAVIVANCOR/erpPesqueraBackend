import { Router } from 'express';
import * as sedesEmpresaController from '../../controllers/Maestros/sedesEmpresa.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para SedesEmpresa
 * Ruta del submódulo: 'sedesEmpresa'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('sedesEmpresa', 'ver'),
  sedesEmpresaController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('sedesEmpresa', 'ver'),
  sedesEmpresaController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('sedesEmpresa', 'crear'),
  sedesEmpresaController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('sedesEmpresa', 'editar'),
  sedesEmpresaController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('sedesEmpresa', 'eliminar'),
  sedesEmpresaController.eliminar
);

export default router;