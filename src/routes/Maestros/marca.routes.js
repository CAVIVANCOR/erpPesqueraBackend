import { Router } from 'express';
import * as marcaController from '../../controllers/Maestros/marca.controller.js';

const router = Router();

// Rutas CRUD para Marca
router.get('/', marcaController.listar);
router.get('/:id', marcaController.obtenerPorId);
router.post('/', marcaController.crear);
router.put('/:id', marcaController.actualizar);
router.delete('/:id', marcaController.eliminar);

export default router;
