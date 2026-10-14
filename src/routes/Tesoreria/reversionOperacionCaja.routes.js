import express from 'express';
import * as reversionOperacionCajaController from '../../controllers/Tesoreria/reversionOperacionCaja.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Reversión de operaciones especializadas de caja (Tesorería Pendientes).
 * Mismo criterio de acceso que las operaciones de Tesorería: usuario autenticado.
 * El control real es el diálogo de confirmación con el detalle de lo que ocurrirá y la
 * confirmación escrita, que el servidor vuelve a exigir.
 */

// GET /api/tesoreria/operaciones?empresaId=&desde=&hasta=&busqueda=
router.get('/', autenticarJWT, reversionOperacionCajaController.listarOperaciones);

// GET /api/tesoreria/operaciones/plan?empresaId=&correlativo=   (o ?movimientoId=)
router.get('/plan', autenticarJWT, reversionOperacionCajaController.obtenerPlan);

// POST /api/tesoreria/operaciones/revertir
router.post('/revertir', autenticarJWT, reversionOperacionCajaController.revertirOperacion);

export default router;
