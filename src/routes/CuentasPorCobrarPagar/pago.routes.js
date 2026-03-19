import { Router } from 'express';
import * as pagoController from '../../controllers/CuentasPorCobrarPagar/pago.controller.js';

const router = Router();

// Solo rutas de consulta (GET)
router.get('/', pagoController.listar);
router.get('/:id', pagoController.obtenerPorId);
router.get('/empresa/:empresaId', pagoController.listarPorEmpresa);
router.get('/cuenta-cobrar/:cuentaPorCobrarId', pagoController.listarPorCuentaCobrar);
router.get('/cuenta-pagar/:cuentaPorPagarId', pagoController.listarPorCuentaPagar);
router.get('/por-movimiento/:movimientoCajaId', pagoController.listarPorMovimiento);
// NOTA: No hay rutas POST, PUT o DELETE
// Los pagos se crean/editan/eliminan desde los tabs de CuentaPorCobrar y CuentaPorPagar

export default router;