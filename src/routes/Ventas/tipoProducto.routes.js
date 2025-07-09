import { Router } from 'express';
import * as tipoProductoController from '../../controllers/Ventas/tipoProducto.controller.js';

const router = Router();

// Rutas CRUD para TipoProducto
router.get('/', tipoProductoController.listar);
router.get('/:id', tipoProductoController.obtenerPorId);
router.post('/', tipoProductoController.crear);
router.put('/:id', tipoProductoController.actualizar);
router.delete('/:id', tipoProductoController.eliminar);

export default router;
