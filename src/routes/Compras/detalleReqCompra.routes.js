import { Router } from 'express';
import * as detalleReqCompraController from '../../controllers/Compras/detalleReqCompra.controller.js';

const router = Router();

// Rutas CRUD para DetalleReqCompra
router.get('/', detalleReqCompraController.listar);
router.get('/:id', detalleReqCompraController.obtenerPorId);
router.post('/', detalleReqCompraController.crear);
router.put('/:id', detalleReqCompraController.actualizar);
router.delete('/:id', detalleReqCompraController.eliminar);

export default router;
