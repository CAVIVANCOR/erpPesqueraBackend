import { Router } from 'express';
import * as movLiqNovedadPescaConsumoController from '../../controllers/Pesca/movLiqNovedadPescaConsumo.controller.js';

const router = Router();

// Rutas CRUD para MovLiqNovedadPescaConsumo
router.get('/', movLiqNovedadPescaConsumoController.listar);
router.get('/:id', movLiqNovedadPescaConsumoController.obtenerPorId);
router.post('/', movLiqNovedadPescaConsumoController.crear);
router.put('/:id', movLiqNovedadPescaConsumoController.actualizar);
router.delete('/:id', movLiqNovedadPescaConsumoController.eliminar);

export default router;
