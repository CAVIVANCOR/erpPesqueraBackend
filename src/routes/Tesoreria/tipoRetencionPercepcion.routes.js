import express from 'express';
import tipoRetencionPercepcionController from '../../controllers/Tesoreria/tipoRetencionPercepcion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas CRUD para TipoRetencionPercepcion
 * Catálogo de tipos de retención y percepción según SUNAT
 * Ruta del submódulo: 'tipoRetencionPercepcion'
 */

router.get(
  '/',
  autenticarJWT,
  checkPermission('tipoRetencionPercepcion', 'ver'),
  tipoRetencionPercepcionController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('tipoRetencionPercepcion', 'ver'),
  tipoRetencionPercepcionController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('tipoRetencionPercepcion', 'crear'),
  tipoRetencionPercepcionController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('tipoRetencionPercepcion', 'editar'),
  tipoRetencionPercepcionController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('tipoRetencionPercepcion', 'eliminar'),
  tipoRetencionPercepcionController.eliminar
);

// Rutas específicas
router.get(
  '/tipo/:tipo',
  autenticarJWT,
  checkPermission('tipoRetencionPercepcion', 'ver'),
  tipoRetencionPercepcionController.listarPorTipo
);

export default router;