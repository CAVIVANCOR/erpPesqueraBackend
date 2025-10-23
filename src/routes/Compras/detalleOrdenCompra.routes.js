import { Router } from 'express';
import * as detalleOrdenCompraController from '../../controllers/Compras/detalleOrdenCompra.controller.js';

const router = Router();

// Rutas CRUD para DetalleOrdenCompra
router.get('/', detalleOrdenCompraController.listar);
router.get('/:id', detalleOrdenCompraController.obtenerPorId);
router.post('/', detalleOrdenCompraController.crear);
router.put('/:id', detalleOrdenCompraController.actualizar);
router.delete('/:id', detalleOrdenCompraController.eliminar);

export default router;