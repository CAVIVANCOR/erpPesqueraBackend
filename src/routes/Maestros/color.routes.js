import { Router } from 'express';
import * as colorController from '../../controllers/Maestros/color.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para Color
 * Ruta del submódulo: 'color'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('color', 'ver'),
  colorController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('color', 'ver'),
  colorController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('color', 'crear'),
  colorController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('color', 'editar'),
  colorController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('color', 'eliminar'),
  colorController.eliminar
);

export default router;