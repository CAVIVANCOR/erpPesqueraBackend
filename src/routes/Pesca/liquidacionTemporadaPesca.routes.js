import { Router } from 'express';
import * as liquidacionTemporadaPescaController from '../../controllers/Pesca/liquidacionTemporadaPesca.controller.js';

const router = Router();

// Rutas CRUD para LiquidacionTemporadaPesca
router.get('/', liquidacionTemporadaPescaController.listar);
router.get('/:id', liquidacionTemporadaPescaController.obtenerPorId);
router.post('/', liquidacionTemporadaPescaController.crear);
router.put('/:id', liquidacionTemporadaPescaController.actualizar);
router.delete('/:id', liquidacionTemporadaPescaController.eliminar);

export default router;
