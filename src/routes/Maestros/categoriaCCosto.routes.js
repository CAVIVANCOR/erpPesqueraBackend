import { Router } from 'express';
import * as categoriaCCostoController from '../../controllers/Maestros/categoriaCCosto.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para CategoriaCCosto
 * Ruta del submódulo: 'categoriaCCosto'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('categoriaCCosto', 'ver'),
  categoriaCCostoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('categoriaCCosto', 'ver'),
  categoriaCCostoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('categoriaCCosto', 'crear'),
  categoriaCCostoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('categoriaCCosto', 'editar'),
  categoriaCCostoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('categoriaCCosto', 'eliminar'),
  categoriaCCostoController.eliminar
);

export default router;