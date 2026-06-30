import express from 'express';
import tipoDetraccionController from '../../controllers/Tesoreria/tipoDetraccion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas CRUD para TipoDetraccion
 * Catálogo de tipos de detracción según SUNAT
 * Ruta del submódulo: 'tipoDetraccion'
 */

router.get(
  '/',
  autenticarJWT,
  checkPermission('tipoDetraccion', 'ver'),
  tipoDetraccionController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('tipoDetraccion', 'ver'),
  tipoDetraccionController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('tipoDetraccion', 'crear'),
  tipoDetraccionController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('tipoDetraccion', 'editar'),
  tipoDetraccionController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('tipoDetraccion', 'eliminar'),
  tipoDetraccionController.eliminar
);

// Rutas específicas
router.get(
  '/activos/lista',
  autenticarJWT,
  checkPermission('tipoDetraccion', 'ver'),
  tipoDetraccionController.listarActivos
);

export default router;