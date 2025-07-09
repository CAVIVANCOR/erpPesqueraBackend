import { Router } from 'express';
import * as colorController from '../../controllers/Maestros/color.controller.js';

const router = Router();

// Rutas CRUD para Color
router.get('/', colorController.listar);
router.get('/:id', colorController.obtenerPorId);
router.post('/', colorController.crear);
router.put('/:id', colorController.actualizar);
router.delete('/:id', colorController.eliminar);

export default router;
