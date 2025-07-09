import { Router } from 'express';
import * as productoController from '../../controllers/Maestros/producto.controller.js';

const router = Router();

// Rutas CRUD para Producto
router.get('/', productoController.listar);
router.get('/:id', productoController.obtenerPorId);
router.post('/', productoController.crear);
router.put('/:id', productoController.actualizar);
router.delete('/:id', productoController.eliminar);

export default router;
