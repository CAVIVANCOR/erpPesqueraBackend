import { Router } from 'express';
import * as liquidacionFaenaPescaController from '../../controllers/Pesca/liquidacionFaenaPesca.controller.js';

const router = Router();

// Rutas CRUD para LiquidacionFaenaPesca
router.get('/', liquidacionFaenaPescaController.listar);
router.get('/:id', liquidacionFaenaPescaController.obtenerPorId);
router.post('/', liquidacionFaenaPescaController.crear);
router.put('/:id', liquidacionFaenaPescaController.actualizar);
router.delete('/:id', liquidacionFaenaPescaController.eliminar);

export default router;
