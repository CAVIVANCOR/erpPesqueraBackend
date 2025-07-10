import { Router } from 'express';
import * as entregaARendirController from '../../controllers/Pesca/entregaARendir.controller.js';

const router = Router();

// Rutas CRUD para EntregaARendir
router.get('/', entregaARendirController.listar);
router.get('/:id', entregaARendirController.obtenerPorId);
router.post('/', entregaARendirController.crear);
router.put('/:id', entregaARendirController.actualizar);
router.delete('/:id', entregaARendirController.eliminar);

export default router;
