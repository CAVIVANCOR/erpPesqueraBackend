import { Router } from 'express';
import * as requerimientoCompraController from '../../controllers/Compras/requerimientoCompra.controller.js';

const router = Router();

// Rutas CRUD para RequerimientoCompra
router.get('/', requerimientoCompraController.listar);
router.get('/:id', requerimientoCompraController.obtenerPorId);
router.post('/', requerimientoCompraController.crear);
router.put('/:id', requerimientoCompraController.actualizar);
router.delete('/:id', requerimientoCompraController.eliminar);

export default router;
