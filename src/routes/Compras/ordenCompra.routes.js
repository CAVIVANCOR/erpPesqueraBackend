import { Router } from 'express';
import * as ordenCompraController from '../../controllers/Compras/ordenCompra.controller.js';

const router = Router();

// Rutas CRUD para OrdenCompra
router.get('/', ordenCompraController.listar);
router.get('/:id', ordenCompraController.obtenerPorId);
router.post('/', ordenCompraController.crear);
router.put('/:id', ordenCompraController.actualizar);
router.delete('/:id', ordenCompraController.eliminar);

export default router;
