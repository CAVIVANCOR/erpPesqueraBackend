import { Router } from 'express';
import * as retencionController from '../../controllers/Contabilidad/retencion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas para Retencion
 * Ruta del submódulo: 'retencion'
 */

// Rutas CRUD básicas
router.get(
  '/', 
  autenticarJWT, 
  checkPermission('retencion', 'ver'),
  retencionController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('retencion', 'ver'),
  retencionController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('retencion', 'crear'),
  retencionController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('retencion', 'editar'),
  retencionController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('retencion', 'eliminar'),
  retencionController.eliminar
);

// Rutas específicas por empresa
router.get(
  '/empresa/:empresaId', 
  autenticarJWT, 
  checkPermission('retencion', 'ver'),
  retencionController.listarPorEmpresa
);

export default router;