import express from 'express';
import * as pagoEspecializadoController from '../../controllers/CuentasPorCobrarPagar/pagoEspecializadoCuentaPorPagar.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * ════════════════════════════════════════════════════════════
 * RUTAS: PAGO ESPECIALIZADO CUENTA POR PAGAR
 * ════════════════════════════════════════════════════════════
 * 
 * Endpoints para gestión de pagos especializados a proveedores con:
 * - Operaciones especializadas con correlativo
 * - Múltiples movimientos de caja
 * - Conceptos SUNAT (Detracción, Retención, Percepción)
 * - Generación de vouchers
 */

// ════════════════════════════════════════════════════════════
// POST: PROCESAR PAGO ESPECIALIZADO
// ════════════════════════════════════════════════════════════
router.post('/', autenticarJWT, pagoEspecializadoController.procesarPagoEspecializado);

// ════════════════════════════════════════════════════════════
// GET: OBTENER DETALLE DE PAGO
// ════════════════════════════════════════════════════════════
router.get('/:id', autenticarJWT, pagoEspecializadoController.obtenerDetallePago);

// ════════════════════════════════════════════════════════════
// GET: OBTENER PAGOS POR CORRELATIVO
// ════════════════════════════════════════════════════════════
router.get('/correlativo/:empresaId/:correlativo', autenticarJWT, pagoEspecializadoController.obtenerPagosPorCorrelativo);

// ════════════════════════════════════════════════════════════
// GET: LISTAR PAGOS ESPECIALIZADOS POR EMPRESA
// ════════════════════════════════════════════════════════════
router.get('/empresa/:empresaId', autenticarJWT, pagoEspecializadoController.listarPagosEspecializados);

// ════════════════════════════════════════════════════════════
// GET: OBTENER RESUMEN DE OPERACIÓN
// ════════════════════════════════════════════════════════════
router.get('/resumen/:empresaId/:correlativo', autenticarJWT, pagoEspecializadoController.obtenerResumenOperacion);

// ════════════════════════════════════════════════════════════
// PATCH: ACTUALIZAR URL VOUCHER CONSOLIDADO
// ════════════════════════════════════════════════════════════
router.patch('/voucher-consolidado/:movimientoEgresoId', autenticarJWT, pagoEspecializadoController.actualizarUrlVoucherConsolidado);

// ════════════════════════════════════════════════════════════
// PATCH: ACTUALIZAR URL VOUCHER INDIVIDUAL
// ════════════════════════════════════════════════════════════
router.patch('/voucher-individual/:movimientoId', autenticarJWT, pagoEspecializadoController.actualizarUrlVoucherIndividual);

// ════════════════════════════════════════════════════════════
// PATCH: ACTUALIZAR URL VOUCHER CONSOLIDADO EN PAGO
// ════════════════════════════════════════════════════════════
router.patch('/pago/:pagoId/voucher-consolidado', autenticarJWT, pagoEspecializadoController.actualizarUrlVoucherConsolidadoPago);

// ════════════════════════════════════════════════════════════
// PATCH: ACTUALIZAR URL COMPROBANTE IMPUESTO EN PAGO
// ════════════════════════════════════════════════════════════
router.patch('/pago/:pagoId/comprobante-impuesto', autenticarJWT, pagoEspecializadoController.actualizarUrlComprobanteImpuesto);

// ════════════════════════════════════════════════════════════
// PUT: ACTUALIZAR URL VOUCHER CONTABLE EN MOVIMIENTO
// ════════════════════════════════════════════════════════════
router.put('/movimiento/:movimientoId/voucher-contable', autenticarJWT, pagoEspecializadoController.actualizarUrlVoucherContable);

export default router;