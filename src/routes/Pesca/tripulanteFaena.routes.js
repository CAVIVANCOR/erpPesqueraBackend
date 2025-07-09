import { Router } from 'express';
import * as tripulanteFaenaController from '../../controllers/Pesca/tripulanteFaena.controller.js';

const router = Router();

// Rutas CRUD para TripulanteFaena
router.get('/', tripulanteFaenaController.listar);
router.get('/:id', tripulanteFaenaController.obtenerPorId);
router.post('/', tripulanteFaenaController.crear);
router.put('/:id', tripulanteFaenaController.actualizar);
router.delete('/:id', tripulanteFaenaController.eliminar);

export default router;
