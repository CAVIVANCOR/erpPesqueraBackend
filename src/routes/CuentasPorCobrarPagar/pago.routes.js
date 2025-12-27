import { Router } from 'express';
import * as pagoController from '../../controllers/CuentasPorCobrarPagar/pago.controller.js';

const router = Router();

router.get('/', pagoController.listar);
router.get('/:id', pagoController.obtenerPorId);
router.post('/', pagoController.crear);
router.put('/:id', pagoController.actualizar);
router.delete('/:id', pagoController.eliminar);

router.get('/empresa/:empresaId', pagoController.listarPorEmpresa);
router.get('/cuenta-cobrar/:cuentaPorCobrarId', pagoController.listarPorCuentaCobrar);
router.get('/cuenta-pagar/:cuentaPorPagarId', pagoController.listarPorCuentaPagar);

export default router;
