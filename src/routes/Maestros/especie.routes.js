import { Router } from 'express';
import * as especieController from '../../controllers/Maestros/especie.controller.js';

const router = Router();

// Rutas CRUD para Especie
router.get('/', especieController.listar);
router.get('/:id', especieController.obtenerPorId);
router.post('/', especieController.crear);
router.put('/:id', especieController.actualizar);
router.delete('/:id', especieController.eliminar);

export default router;
