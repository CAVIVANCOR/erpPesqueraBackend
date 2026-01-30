import { Router } from 'express';
import * as ordenCompraController from '../../controllers/Compras/ordenCompra.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas para OrdenCompra
 * Ruta del submódulo: 'ordenCompra'
 */

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.post(
  '/generar-desde-requerimiento', 
  autenticarJWT, 
  checkPermission('ordenCompra', 'crear'),
  ordenCompraController.generarDesdeRequerimiento
);

// Rutas CRUD para OrdenCompra
router.get(
  '/', 
  autenticarJWT, 
  checkPermission('ordenCompra', 'ver'),
  ordenCompraController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('ordenCompra', 'ver'),
  ordenCompraController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('ordenCompra', 'crear'),
  ordenCompraController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('ordenCompra', 'editar'),
  ordenCompraController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('ordenCompra', 'eliminar'),
  ordenCompraController.eliminar
);

// Rutas para operaciones especiales
router.post(
  '/:id/aprobar', 
  autenticarJWT, 
  checkPermission('ordenCompra', 'aprobar'),
  ordenCompraController.aprobar
);

router.post(
  '/:id/anular', 
  autenticarJWT, 
  checkPermission('ordenCompra', 'eliminar'),
  ordenCompraController.anular
);

router.post(
  '/:id/generar-movimiento', 
  autenticarJWT, 
  checkPermission('ordenCompra', 'crear'),
  ordenCompraController.generarMovimiento
);

router.post(
  '/:id/generar-kardex', 
  autenticarJWT, 
  checkPermission('ordenCompra', 'crear'),
  ordenCompraController.generarKardex
);

router.post(
  '/:id/regenerar-kardex', 
  autenticarJWT, 
  checkPermission('ordenCompra', 'editar'),
  ordenCompraController.regenerarKardex
);

export default router;