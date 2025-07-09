import { Router } from 'express';
import * as documentoPescaController from '../../controllers/Pesca/documentoPesca.controller.js';

const router = Router();

// Rutas CRUD para DocumentoPesca
router.get('/', documentoPescaController.listar);
router.get('/:id', documentoPescaController.obtenerPorId);
router.post('/', documentoPescaController.crear);
router.put('/:id', documentoPescaController.actualizar);
router.delete('/:id', documentoPescaController.eliminar);

export default router;
