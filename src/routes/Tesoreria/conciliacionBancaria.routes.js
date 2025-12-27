import { Router } from 'express';
import * as conciliacionBancariaController from '../../controllers/Tesoreria/conciliacionBancaria.controller.js';

const router = Router();

router.get('/', conciliacionBancariaController.listar);
router.get('/:id', conciliacionBancariaController.obtenerPorId);
router.post('/', conciliacionBancariaController.crear);
router.put('/:id', conciliacionBancariaController.actualizar);
router.delete('/:id', conciliacionBancariaController.eliminar);

router.get('/empresa/:empresaId', conciliacionBancariaController.listarPorEmpresa);
router.get('/cuenta-corriente/:cuentaCorrienteId', conciliacionBancariaController.listarPorCuentaCorriente);
router.post('/:id/marcar-conciliado', conciliacionBancariaController.marcarConciliado);

export default router;
