import express from 'express';
import * as pendientesController from '../../controllers/Tesoreria/pendientes.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas para consulta de documentos pendientes de cobro y pago
 * Ruta del submódulo: 'tesoreriaPendientes'
 */

// GET /api/tesoreria/pendientes
// Query params: empresaId, tipo, vencimiento, monedaId
router.get(
  '/',
  autenticarJWT,
  checkPermission('tesoreriaPendientes', 'ver'),
  pendientesController.listarPendientes
);

// GET /api/tesoreria/pendientes/resumen
// Query params: empresaId
router.get(
  '/resumen',
  autenticarJWT,
  checkPermission('tesoreriaPendientes', 'ver'),
  pendientesController.obtenerResumen
);

export default router;
