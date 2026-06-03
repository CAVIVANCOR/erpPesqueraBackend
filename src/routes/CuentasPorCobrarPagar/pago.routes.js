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
// Rutas CRUD para PagoCuentaPorCobrar
router.post('/cuenta-por-cobrar', pagoController.crearPagoCobrar);
router.put('/cuenta-por-cobrar/:id', pagoController.actualizarPagoCobrar);
router.delete('/cuenta-por-cobrar/:id', pagoController.eliminarPagoCobrar);

// Rutas CRUD para PagoCuentaPorPagar
router.post('/cuenta-por-pagar', pagoController.crearPagoPagar);
router.put('/cuenta-por-pagar/:id', pagoController.actualizarPagoPagar);
router.delete('/cuenta-por-pagar/:id', pagoController.eliminarPagoPagar);

export default router;