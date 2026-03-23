import express from 'express';
import retencionController from '../../controllers/Tesoreria/retencion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas CRUD para Retencion
 * Gestiona las retenciones fiscales
 * Ruta del submódulo: 'retencion'
 */

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

// Rutas específicas
router.get(
  '/empresa/:empresaId',
  autenticarJWT,
  checkPermission('retencion', 'ver'),
  retencionController.listarPorEmpresa
);

router.get(
  '/proveedor/:proveedorId',
  autenticarJWT,
  checkPermission('retencion', 'ver'),
  retencionController.listarPorProveedor
);

router.get(
  '/periodo/:periodo',
  autenticarJWT,
  checkPermission('retencion', 'ver'),
  retencionController.listarPorPeriodo
);

export default router;