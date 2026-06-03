import express from 'express';
import * as registrarMovimientoPagoController from '../../controllers/Tesoreria/registrarMovimientoPago.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas para registrar MovimientoCaja + Pago en transacción atómica
 * Ruta del submódulo: 'tesoreriaRegistrarPago'
 */

// POST /api/tesoreria/registrar-pago/cuenta-por-cobrar
router.post(
  '/cuenta-por-cobrar',
  autenticarJWT,
  checkPermission('tesoreriaRegistrarPago', 'crear'),
  registrarMovimientoPagoController.registrarPagoCuentaPorCobrar
);

// POST /api/tesoreria/registrar-pago/cuenta-por-pagar
router.post(
  '/cuenta-por-pagar',
  autenticarJWT,
  checkPermission('tesoreriaRegistrarPago', 'crear'),
  registrarMovimientoPagoController.registrarPagoCuentaPorPagar
);

export default router;