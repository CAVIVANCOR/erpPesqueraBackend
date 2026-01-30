import { Router } from 'express';
import * as especieController from '../../controllers/Maestros/especie.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para Especie
 * Ruta del submódulo: 'especie'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('especie', 'ver'),
  especieController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('especie', 'ver'),
  especieController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('especie', 'crear'),
  especieController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('especie', 'editar'),
  especieController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('especie', 'eliminar'),
  especieController.eliminar
);

export default router;