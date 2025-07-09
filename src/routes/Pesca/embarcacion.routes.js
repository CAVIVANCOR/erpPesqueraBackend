import { Router } from 'express';
import * as embarcacionController from '../../controllers/Pesca/embarcacion.controller.js';

const router = Router();

// Rutas CRUD para Embarcacion
router.get('/', embarcacionController.listar);
router.get('/:id', embarcacionController.obtenerPorId);
router.post('/', embarcacionController.crear);
router.put('/:id', embarcacionController.actualizar);
router.delete('/:id', embarcacionController.eliminar);

export default router;
