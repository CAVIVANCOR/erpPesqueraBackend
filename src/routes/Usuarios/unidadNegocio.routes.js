import { Router } from 'express';
import * as unidadNegocioController from '../../controllers/Usuarios/unidadNegocio.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para UnidadNegocio
 * Ruta del submódulo: 'unidadesNegocio'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('unidadesNegocio', 'ver'),
  unidadNegocioController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('unidadesNegocio', 'ver'),
  unidadNegocioController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('unidadesNegocio', 'crear'),
  unidadNegocioController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('unidadesNegocio', 'editar'),
  unidadNegocioController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('unidadesNegocio', 'eliminar'),
  unidadNegocioController.eliminar
);

export default router;