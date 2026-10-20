import express from 'express';
import * as letraCambioOperacionController from '../../controllers/Tesoreria/letraCambioOperacion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Letras de cambio de compras (PAGAR) y ventas (COBRAR): canje de facturas, pago/cobro desde Tesorería,
 * refinanciación y vencimientos. Submódulo de permisos: 'letra-cambio' (ruta del submódulo Letra de Cambio).
 */

// GET /api/tesoreria/letras-operaciones
router.get('/', autenticarJWT, checkPermission('letra-cambio', 'ver'), letraCambioOperacionController.listar);

// Rutas fijas ANTES de /:id
router.get('/documentos-canjeables', autenticarJWT, checkPermission('letra-cambio', 'ver'), letraCambioOperacionController.documentosCanjeables);
router.get('/pendientes-pago', autenticarJWT, letraCambioOperacionController.pendientesPago);
router.post('/canje', autenticarJWT, checkPermission('letra-cambio', 'crear'), letraCambioOperacionController.canjear);
router.post('/refinanciar', autenticarJWT, checkPermission('letra-cambio', 'crear'), letraCambioOperacionController.refinanciar);
router.post('/pagos', autenticarJWT, letraCambioOperacionController.pagar);
router.post('/proceso/vencimientos', autenticarJWT, checkPermission('letra-cambio', 'editar'), letraCambioOperacionController.procesarVencimientos);

router.get('/:id', autenticarJWT, checkPermission('letra-cambio', 'ver'), letraCambioOperacionController.obtenerDetalle);
router.post('/:id/anular-canje', autenticarJWT, checkPermission('letra-cambio', 'eliminar'), letraCambioOperacionController.anularCanje);
router.post('/:id/revertir-refinanciacion', autenticarJWT, checkPermission('letra-cambio', 'eliminar'), letraCambioOperacionController.revertirRefinanciacion);

export default router;
