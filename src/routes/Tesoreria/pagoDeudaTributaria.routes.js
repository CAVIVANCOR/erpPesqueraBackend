import { Router } from 'express';
import * as pagoDeudaTributariaController from '../../controllers/Tesoreria/pagoDeudaTributaria.controller.js';

const router = Router();

router.get('/', pagoDeudaTributariaController.listar);
router.get('/:id', pagoDeudaTributariaController.obtenerPorId);
router.post('/', pagoDeudaTributariaController.crear);
router.put('/:id', pagoDeudaTributariaController.actualizar);
router.delete('/:id', pagoDeudaTributariaController.eliminar);

router.get('/deuda/:deudaId', pagoDeudaTributariaController.listarPorDeuda);

export default router;