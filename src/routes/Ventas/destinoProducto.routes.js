import { Router } from 'express';
import * as destinoProductoController from '../../controllers/Ventas/destinoProducto.controller.js';

const router = Router();

// Rutas CRUD para DestinoProducto
router.get('/', destinoProductoController.listar);
router.get('/:id', destinoProductoController.obtenerPorId);
router.post('/', destinoProductoController.crear);
router.put('/:id', destinoProductoController.actualizar);
router.delete('/:id', destinoProductoController.eliminar);

export default router;
