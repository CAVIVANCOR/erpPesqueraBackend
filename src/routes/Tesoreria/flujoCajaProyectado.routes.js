import express from 'express';
import flujoCajaProyectadoController from '../../controllers/Tesoreria/flujoCajaProyectado.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas CRUD para FlujoCajaProyectado
 * Gestiona las proyecciones de flujo de caja
 * Ruta del submódulo: 'flujoCajaProyectado'
 */

router.get(
  '/',
  autenticarJWT,
  checkPermission('flujoCajaProyectado', 'ver'),
  flujoCajaProyectadoController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('flujoCajaProyectado', 'ver'),
  flujoCajaProyectadoController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('flujoCajaProyectado', 'crear'),
  flujoCajaProyectadoController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('flujoCajaProyectado', 'editar'),
  flujoCajaProyectadoController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('flujoCajaProyectado', 'eliminar'),
  flujoCajaProyectadoController.eliminar
);

// Rutas específicas
router.get(
  '/empresa/:empresaId',
  autenticarJWT,
  checkPermission('flujoCajaProyectado', 'ver'),
  flujoCajaProyectadoController.listarPorEmpresa
);

router.get(
  '/empresa/:empresaId/periodo/:periodo',
  autenticarJWT,
  checkPermission('flujoCajaProyectado', 'ver'),
  flujoCajaProyectadoController.obtenerPorEmpresaPeriodo
);

export default router;