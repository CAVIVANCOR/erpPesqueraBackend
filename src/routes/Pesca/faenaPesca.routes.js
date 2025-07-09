import { Router } from 'express';
import * as faenaPescaController from '../../controllers/Pesca/faenaPesca.controller.js';

const router = Router();

// Rutas CRUD para FaenaPesca
router.get('/', faenaPescaController.listar);
router.get('/:id', faenaPescaController.obtenerPorId);
router.post('/', faenaPescaController.crear);
router.put('/:id', faenaPescaController.actualizar);
router.delete('/:id', faenaPescaController.eliminar);

export default router;
