import { Router } from 'express';
import * as sublineaCreditoController from '../../controllers/Tesoreria/sublineaCredito.controller.js';

const router = Router();

router.get('/', sublineaCreditoController.listar);
router.get('/activas', sublineaCreditoController.listarActivas);
router.get('/linea/:lineaCreditoId', sublineaCreditoController.listarPorLinea);
router.get('/:id', sublineaCreditoController.obtenerPorId);
router.post('/', sublineaCreditoController.crear);
router.post('/:id/actualizar-monto', sublineaCreditoController.actualizarMontoUtilizado);
router.put('/:id', sublineaCreditoController.actualizar);
router.delete('/:id', sublineaCreditoController.eliminar);

export default router;
