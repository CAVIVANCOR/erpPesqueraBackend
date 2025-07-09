import { Router } from 'express';
import * as tripulanteFaenaConsumoController from '../../controllers/Pesca/tripulanteFaenaConsumo.controller.js';

const router = Router();

// Rutas CRUD para TripulanteFaenaConsumo
router.get('/', tripulanteFaenaConsumoController.listar);
router.get('/:id', tripulanteFaenaConsumoController.obtenerPorId);
router.post('/', tripulanteFaenaConsumoController.crear);
router.put('/:id', tripulanteFaenaConsumoController.actualizar);
router.delete('/:id', tripulanteFaenaConsumoController.eliminar);

export default router;
