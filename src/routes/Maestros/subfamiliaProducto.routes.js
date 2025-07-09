import { Router } from 'express';
import * as subfamiliaProductoController from '../../controllers/Maestros/subfamiliaProducto.controller.js';

const router = Router();

// Rutas CRUD para SubfamiliaProducto
router.get('/', subfamiliaProductoController.listar);
router.get('/:id', subfamiliaProductoController.obtenerPorId);
router.post('/', subfamiliaProductoController.crear);
router.put('/:id', subfamiliaProductoController.actualizar);
router.delete('/:id', subfamiliaProductoController.eliminar);

export default router;
