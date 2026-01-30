import { Router } from 'express';
import * as marcaController from '../../controllers/Maestros/marca.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para Marca
 * Ruta del submódulo: 'marca'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('marca', 'ver'),
  marcaController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('marca', 'ver'),
  marcaController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('marca', 'crear'),
  marcaController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('marca', 'editar'),
  marcaController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('marca', 'eliminar'),
  marcaController.eliminar
);

export default router;