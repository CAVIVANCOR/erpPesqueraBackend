import { Router } from 'express';
import * as movLiquidacionTemporadaPescaController from '../../controllers/Pesca/movLiquidacionTemporadaPesca.controller.js';

const router = Router();

// Rutas CRUD para MovLiquidacionTemporadaPesca
router.get('/', movLiquidacionTemporadaPescaController.listar);
router.get('/:id', movLiquidacionTemporadaPescaController.obtenerPorId);
router.post('/', movLiquidacionTemporadaPescaController.crear);
router.put('/:id', movLiquidacionTemporadaPescaController.actualizar);
router.delete('/:id', movLiquidacionTemporadaPescaController.eliminar);

export default router;
