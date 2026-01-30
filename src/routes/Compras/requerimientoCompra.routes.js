import { Router } from 'express';
import * as requerimientoCompraController from '../../controllers/Compras/requerimientoCompra.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas para RequerimientoCompra
 * Ruta del submódulo: 'requerimientoCompra'
 */

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get(
  '/series-doc', 
  autenticarJWT, 
  checkPermission('requerimientoCompra', 'ver'),
  requerimientoCompraController.obtenerSeriesDoc
);

// Rutas CRUD para RequerimientoCompra
router.get(
  '/', 
  autenticarJWT, 
  checkPermission('requerimientoCompra', 'ver'),
  requerimientoCompraController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('requerimientoCompra', 'ver'),
  requerimientoCompraController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('requerimientoCompra', 'crear'),
  requerimientoCompraController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('requerimientoCompra', 'editar'),
  requerimientoCompraController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('requerimientoCompra', 'eliminar'),
  requerimientoCompraController.eliminar
);

// Rutas para operaciones de aprobación, anulación y autorización
router.post(
  '/:id/aprobar', 
  autenticarJWT, 
  checkPermission('requerimientoCompra', 'aprobar'),
  requerimientoCompraController.aprobar
);

router.post(
  '/:id/anular', 
  autenticarJWT, 
  checkPermission('requerimientoCompra', 'eliminar'),
  requerimientoCompraController.anular
);

router.post(
  '/:id/autorizar-compra', 
  autenticarJWT, 
  checkPermission('requerimientoCompra', 'aprobar'),
  requerimientoCompraController.autorizarCompra
);

export default router;