import express from 'express';
import * as saldosCuentasController from '../../controllers/Tesoreria/saldosCuentas.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas para consulta de saldos de cuentas corrientes
 * Ruta del submódulo: 'tesoreriaSaldos'
 */

// GET /api/tesoreria/saldos-cuentas
// Query params: empresaId, monedaId, soloActivas
router.get(
  '/',
  autenticarJWT,
  checkPermission('tesoreriaSaldos', 'ver'),
  saldosCuentasController.listarSaldosCuentas
);

// GET /api/tesoreria/saldos-cuentas/consolidado
// Query params: empresaId
router.get(
  '/consolidado',
  autenticarJWT,
  checkPermission('tesoreriaSaldos', 'ver'),
  saldosCuentasController.obtenerSaldoConsolidado
);

// GET /api/tesoreria/saldos-cuentas/:id/detalle
// Params: id (cuentaCorrienteId)
// Query params: limite
router.get(
  '/:id/detalle',
  autenticarJWT,
  checkPermission('tesoreriaSaldos', 'ver'),
  saldosCuentasController.obtenerDetalleCuenta
);

export default router;