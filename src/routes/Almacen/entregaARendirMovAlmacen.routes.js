import { Router } from 'express';
import * as entregaARendirMovAlmacenController from '../../controllers/Almacen/entregaARendirMovAlmacen.controller.js';

const router = Router();

// Rutas CRUD para EntregaARendirMovAlmacen
router.get('/', entregaARendirMovAlmacenController.listar);
router.get('/:id', entregaARendirMovAlmacenController.obtenerPorId);
router.post('/', entregaARendirMovAlmacenController.crear);
router.put('/:id', entregaARendirMovAlmacenController.actualizar);
router.delete('/:id', entregaARendirMovAlmacenController.eliminar);

export default router;
