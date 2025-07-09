import { Router } from 'express';
import * as movLiquidacionFaenaPescaController from '../../controllers/Pesca/movLiquidacionFaenaPesca.controller.js';

const router = Router();

// Rutas CRUD para MovLiquidacionFaenaPesca
router.get('/', movLiquidacionFaenaPescaController.listar);
router.get('/:id', movLiquidacionFaenaPescaController.obtenerPorId);
router.post('/', movLiquidacionFaenaPescaController.crear);
router.put('/:id', movLiquidacionFaenaPescaController.actualizar);
router.delete('/:id', movLiquidacionFaenaPescaController.eliminar);

export default router;
