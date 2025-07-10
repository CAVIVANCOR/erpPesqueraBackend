import { Router } from 'express';
import * as detMovsEntregaRendirController from '../../controllers/Pesca/detMovsEntregaRendir.controller.js';

const router = Router();

// Rutas CRUD para DetMovsEntregaRendir
router.get('/', detMovsEntregaRendirController.listar);
router.get('/:id', detMovsEntregaRendirController.obtenerPorId);
router.post('/', detMovsEntregaRendirController.crear);
router.put('/:id', detMovsEntregaRendirController.actualizar);
router.delete('/:id', detMovsEntregaRendirController.eliminar);

export default router;
