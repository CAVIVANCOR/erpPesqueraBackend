import { Router } from 'express';
import * as tipoEstadoProductoController from '../../controllers/Ventas/tipoEstadoProducto.controller.js';

const router = Router();

// Rutas CRUD para TipoEstadoProducto
router.get('/', tipoEstadoProductoController.listar);
router.get('/:id', tipoEstadoProductoController.obtenerPorId);
router.post('/', tipoEstadoProductoController.crear);
router.put('/:id', tipoEstadoProductoController.actualizar);
router.delete('/:id', tipoEstadoProductoController.eliminar);

export default router;
