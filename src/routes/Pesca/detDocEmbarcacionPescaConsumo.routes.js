import { Router } from 'express';
import * as detDocEmbarcacionPescaConsumoController from '../../controllers/Pesca/detDocEmbarcacionPescaConsumo.controller.js';

const router = Router();

// Rutas CRUD para DetDocEmbarcacionPescaConsumo
router.get('/', detDocEmbarcacionPescaConsumoController.listar);
router.get('/:id', detDocEmbarcacionPescaConsumoController.obtenerPorId);
router.post('/', detDocEmbarcacionPescaConsumoController.crear);
router.put('/:id', detDocEmbarcacionPescaConsumoController.actualizar);
router.delete('/:id', detDocEmbarcacionPescaConsumoController.eliminar);

export default router;
