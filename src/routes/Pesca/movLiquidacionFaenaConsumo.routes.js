import { Router } from 'express';
import * as movLiquidacionFaenaConsumoController from '../../controllers/Pesca/movLiquidacionFaenaConsumo.controller.js';

const router = Router();

// Rutas CRUD para MovLiquidacionFaenaConsumo
router.get('/', movLiquidacionFaenaConsumoController.listar);
router.get('/:id', movLiquidacionFaenaConsumoController.obtenerPorId);
router.post('/', movLiquidacionFaenaConsumoController.crear);
router.put('/:id', movLiquidacionFaenaConsumoController.actualizar);
router.delete('/:id', movLiquidacionFaenaConsumoController.eliminar);

export default router;
