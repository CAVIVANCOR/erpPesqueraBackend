import { Router } from 'express';
import * as unidadMedidaController from '../../controllers/Maestros/unidadMedida.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para UnidadMedida
 * Ruta del submódulo: 'unidadMedida'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('unidadMedida', 'ver'),
  unidadMedidaController.listar
);

// ⚠️ RUTAS ESPECIALES RESTAURADAS - Deben ir ANTES de /:id
router.get(
  '/metricas', 
  autenticarJWT, 
  checkPermission('unidadMedida', 'ver'),
  unidadMedidaController.listarMetricas
);

router.get(
  '/default-metrica', 
  autenticarJWT, 
  checkPermission('unidadMedida', 'ver'),
  unidadMedidaController.obtenerDefaultMetrica
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('unidadMedida', 'ver'),
  unidadMedidaController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('unidadMedida', 'crear'),
  unidadMedidaController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('unidadMedida', 'editar'),
  unidadMedidaController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('unidadMedida', 'eliminar'),
  unidadMedidaController.eliminar
);

export default router;