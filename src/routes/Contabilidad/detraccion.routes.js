import { Router } from 'express';
import * as detraccionController from '../../controllers/Contabilidad/detraccion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas para Detraccion
 * Ruta del submódulo: 'detraccion'
 */

// Rutas CRUD básicas
router.get(
  '/', 
  autenticarJWT, 
  checkPermission('detraccion', 'ver'),
  detraccionController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('detraccion', 'ver'),
  detraccionController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('detraccion', 'crear'),
  detraccionController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('detraccion', 'editar'),
  detraccionController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('detraccion', 'eliminar'),
  detraccionController.eliminar
);

// Rutas específicas por empresa
router.get(
  '/empresa/:empresaId', 
  autenticarJWT, 
  checkPermission('detraccion', 'ver'),
  detraccionController.listarPorEmpresa
);

export default router;