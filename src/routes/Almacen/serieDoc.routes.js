import { Router } from 'express';
import * as serieDocController from '../../controllers/Almacen/serieDoc.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para SerieDoc
 * Ruta del submódulo: 'serieDoc'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('serieDoc', 'ver'),
  serieDocController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('serieDoc', 'ver'),
  serieDocController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('serieDoc', 'crear'),
  serieDocController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('serieDoc', 'editar'),
  serieDocController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('serieDoc', 'eliminar'),
  serieDocController.eliminar
);

export default router;