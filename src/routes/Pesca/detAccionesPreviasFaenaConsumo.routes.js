import { Router } from 'express';
import * as detAccionesPreviasFaenaConsumoController from '../../controllers/Pesca/detAccionesPreviasFaenaConsumo.controller.js';

const router = Router();

// Rutas CRUD para DetAccionesPreviasFaenaConsumo
router.get('/', detAccionesPreviasFaenaConsumoController.listar);
router.get('/:id', detAccionesPreviasFaenaConsumoController.obtenerPorId);
router.post('/', detAccionesPreviasFaenaConsumoController.crear);
router.put('/:id', detAccionesPreviasFaenaConsumoController.actualizar);
router.delete('/:id', detAccionesPreviasFaenaConsumoController.eliminar);

export default router;
