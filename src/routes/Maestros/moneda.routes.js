import { Router } from 'express';
import * as monedaController from '../../controllers/Maestros/moneda.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para Moneda
 * Ruta del submódulo: 'monedas'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('monedas', 'ver'),
  monedaController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('monedas', 'ver'),
  monedaController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('monedas', 'crear'),
  monedaController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('monedas', 'editar'),
  monedaController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('monedas', 'eliminar'),
  monedaController.eliminar
);

export default router;