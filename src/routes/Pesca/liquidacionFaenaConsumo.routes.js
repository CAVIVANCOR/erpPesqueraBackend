import { Router } from 'express';
import * as liquidacionFaenaConsumoController from '../../controllers/Pesca/liquidacionFaenaConsumo.controller.js';

const router = Router();

// Rutas CRUD para LiquidacionFaenaConsumo
router.get('/', liquidacionFaenaConsumoController.listar);
router.get('/:id', liquidacionFaenaConsumoController.obtenerPorId);
router.post('/', liquidacionFaenaConsumoController.crear);
router.put('/:id', liquidacionFaenaConsumoController.actualizar);
router.delete('/:id', liquidacionFaenaConsumoController.eliminar);

export default router;
