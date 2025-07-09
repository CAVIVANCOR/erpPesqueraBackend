import { Router } from 'express';
import * as liqNovedadPescaConsumoController from '../../controllers/Pesca/liqNovedadPescaConsumo.controller.js';

const router = Router();

// Rutas CRUD para LiqNovedadPescaConsumo
router.get('/', liqNovedadPescaConsumoController.listar);
router.get('/:id', liqNovedadPescaConsumoController.obtenerPorId);
router.post('/', liqNovedadPescaConsumoController.crear);
router.put('/:id', liqNovedadPescaConsumoController.actualizar);
router.delete('/:id', liqNovedadPescaConsumoController.eliminar);

export default router;
