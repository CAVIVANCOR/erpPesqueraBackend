import { Router } from 'express';
import * as accionesPreviasFaenaController from '../../controllers/Pesca/accionesPreviasFaena.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para AccionesPreviasFaena
 * Ruta del submódulo: 'accionesPreviasFaena'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('accionesPreviasFaena', 'ver'),
  accionesPreviasFaenaController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('accionesPreviasFaena', 'ver'),
  accionesPreviasFaenaController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('accionesPreviasFaena', 'crear'),
  accionesPreviasFaenaController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('accionesPreviasFaena', 'editar'),
  accionesPreviasFaenaController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('accionesPreviasFaena', 'eliminar'),
  accionesPreviasFaenaController.eliminar
);

export default router;