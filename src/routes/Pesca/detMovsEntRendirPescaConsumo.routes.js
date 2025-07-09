import { Router } from 'express';
import * as detMovsEntRendirPescaConsumoController from '../../controllers/Pesca/detMovsEntRendirPescaConsumo.controller.js';

const router = Router();

// Rutas CRUD para DetMovsEntRendirPescaConsumo
router.get('/', detMovsEntRendirPescaConsumoController.listar);
router.get('/:id', detMovsEntRendirPescaConsumoController.obtenerPorId);
router.post('/', detMovsEntRendirPescaConsumoController.crear);
router.put('/:id', detMovsEntRendirPescaConsumoController.actualizar);
router.delete('/:id', detMovsEntRendirPescaConsumoController.eliminar);

export default router;
