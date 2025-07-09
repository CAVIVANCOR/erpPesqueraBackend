import { Router } from 'express';
import * as faenaPescaConsumoController from '../../controllers/Pesca/faenaPescaConsumo.controller.js';

const router = Router();

// Rutas CRUD para FaenaPescaConsumo
router.get('/', faenaPescaConsumoController.listar);
router.get('/:id', faenaPescaConsumoController.obtenerPorId);
router.post('/', faenaPescaConsumoController.crear);
router.put('/:id', faenaPescaConsumoController.actualizar);
router.delete('/:id', faenaPescaConsumoController.eliminar);

export default router;
