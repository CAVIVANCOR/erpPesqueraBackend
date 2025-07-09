import { Router } from 'express';
import * as novedadPescaConsumoController from '../../controllers/Pesca/novedadPescaConsumo.controller.js';

const router = Router();

// Rutas CRUD para NovedadPescaConsumo
router.get('/', novedadPescaConsumoController.listar);
router.get('/:id', novedadPescaConsumoController.obtenerPorId);
router.post('/', novedadPescaConsumoController.crear);
router.put('/:id', novedadPescaConsumoController.actualizar);
router.delete('/:id', novedadPescaConsumoController.eliminar);

export default router;
