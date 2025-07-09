import { Router } from 'express';
import * as detDocTripulantesFaenaConsumoController from '../../controllers/Pesca/detDocTripulantesFaenaConsumo.controller.js';

const router = Router();

// Rutas CRUD para DetDocTripulantesFaenaConsumo
router.get('/', detDocTripulantesFaenaConsumoController.listar);
router.get('/:id', detDocTripulantesFaenaConsumoController.obtenerPorId);
router.post('/', detDocTripulantesFaenaConsumoController.crear);
router.put('/:id', detDocTripulantesFaenaConsumoController.actualizar);
router.delete('/:id', detDocTripulantesFaenaConsumoController.eliminar);

export default router;
