import { Router } from 'express';
import * as detCalaPescaConsumoController from '../../controllers/Pesca/detCalaPescaConsumo.controller.js';

const router = Router();

// Rutas CRUD para DetCalaPescaConsumo
router.get('/', detCalaPescaConsumoController.listar);
router.get('/cala/:calaId', detCalaPescaConsumoController.obtenerPorCala);  // ← AGREGAR ANTES de /:id
router.get('/:id', detCalaPescaConsumoController.obtenerPorId);
router.post('/', detCalaPescaConsumoController.crear);
router.put('/:id', detCalaPescaConsumoController.actualizar);
router.delete('/:id', detCalaPescaConsumoController.eliminar);

export default router;
