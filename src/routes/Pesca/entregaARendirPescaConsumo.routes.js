import { Router } from 'express';
import * as entregaARendirPescaConsumoController from '../../controllers/Pesca/entregaARendirPescaConsumo.controller.js';

const router = Router();

// Rutas CRUD para EntregaARendirPescaConsumo
router.get('/', entregaARendirPescaConsumoController.listar);
router.get('/:id', entregaARendirPescaConsumoController.obtenerPorId);
router.post('/', entregaARendirPescaConsumoController.crear);
router.put('/:id', entregaARendirPescaConsumoController.actualizar);
router.delete('/:id', entregaARendirPescaConsumoController.eliminar);

export default router;
