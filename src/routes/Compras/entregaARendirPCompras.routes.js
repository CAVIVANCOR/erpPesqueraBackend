import { Router } from 'express';
import * as entregaARendirPComprasController from '../../controllers/Compras/entregaARendirPCompras.controller.js';

const router = Router();

// Rutas CRUD para EntregaARendirPCompras
router.get('/', entregaARendirPComprasController.listar);
router.get('/:id', entregaARendirPComprasController.obtenerPorId);
router.post('/', entregaARendirPComprasController.crear);
router.put('/:id', entregaARendirPComprasController.actualizar);
router.delete('/:id', entregaARendirPComprasController.eliminar);

export default router;
