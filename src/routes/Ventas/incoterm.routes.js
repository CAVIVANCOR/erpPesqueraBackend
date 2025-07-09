import { Router } from 'express';
import * as incotermController from '../../controllers/Ventas/incoterm.controller.js';

const router = Router();

// Rutas CRUD para Incoterm
router.get('/', incotermController.listar);
router.get('/:id', incotermController.obtenerPorId);
router.post('/', incotermController.crear);
router.put('/:id', incotermController.actualizar);
router.delete('/:id', incotermController.eliminar);

export default router;
