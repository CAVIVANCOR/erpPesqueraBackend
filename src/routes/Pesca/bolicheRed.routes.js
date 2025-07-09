import { Router } from 'express';
import * as bolicheRedController from '../../controllers/Pesca/bolicheRed.controller.js';

const router = Router();

// Rutas CRUD para BolicheRed
router.get('/', bolicheRedController.listar);
router.get('/:id', bolicheRedController.obtenerPorId);
router.post('/', bolicheRedController.crear);
router.put('/:id', bolicheRedController.actualizar);
router.delete('/:id', bolicheRedController.eliminar);

export default router;
