import { Router } from 'express';
import * as categoriaTipoMovEntregaRendirController from '../../controllers/Pesca/categoriaTipoMovEntregaRendir.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para CategoriaTipoMovEntregaRendir
 * Ruta del submódulo: 'categoriaTipoMovEntregaRendir'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('categoriaTipoMovEntregaRendir', 'ver'),
  categoriaTipoMovEntregaRendirController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('categoriaTipoMovEntregaRendir', 'ver'),
  categoriaTipoMovEntregaRendirController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('categoriaTipoMovEntregaRendir', 'crear'),
  categoriaTipoMovEntregaRendirController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('categoriaTipoMovEntregaRendir', 'editar'),
  categoriaTipoMovEntregaRendirController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('categoriaTipoMovEntregaRendir', 'eliminar'),
  categoriaTipoMovEntregaRendirController.eliminar
);

export default router;