import { Router } from 'express';
import * as cuentaPorCobrarController from '../../controllers/CuentasPorCobrarPagar/cuentaPorCobrar.controller.js';

const router = Router();

router.get('/', cuentaPorCobrarController.listar);
router.get('/:id', cuentaPorCobrarController.obtenerPorId);
router.post('/', cuentaPorCobrarController.crear);
router.put('/:id', cuentaPorCobrarController.actualizar);
router.delete('/:id', cuentaPorCobrarController.eliminar);

router.get('/empresa/:empresaId', cuentaPorCobrarController.listarPorEmpresa);
router.get('/empresa/:empresaId/pendientes', cuentaPorCobrarController.listarPendientes);
router.get('/empresa/:empresaId/vencidas', cuentaPorCobrarController.listarVencidas);
router.get('/cliente/:clienteId', cuentaPorCobrarController.listarPorCliente);

export default router;
