import { Router } from 'express';
import * as pagoDeudaPersonalController from '../../controllers/Tesoreria/pagoDeudaPersonal.controller.js';

const router = Router();

router.get('/', pagoDeudaPersonalController.listar);
router.get('/:id', pagoDeudaPersonalController.obtenerPorId);
router.post('/', pagoDeudaPersonalController.crear);
router.put('/:id', pagoDeudaPersonalController.actualizar);
router.delete('/:id', pagoDeudaPersonalController.eliminar);

router.get('/deuda/:deudaId', pagoDeudaPersonalController.listarPorDeuda);

export default router;