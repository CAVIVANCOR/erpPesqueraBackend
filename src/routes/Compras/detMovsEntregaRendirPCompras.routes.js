import { Router } from 'express';
import * as detMovsEntregaRendirPComprasController from '../../controllers/Compras/detMovsEntregaRendirPCompras.controller.js';

const router = Router();

// Rutas CRUD para DetMovsEntregaRendirPCompras
router.get('/', detMovsEntregaRendirPComprasController.listar);
router.get('/:id', detMovsEntregaRendirPComprasController.obtenerPorId);
router.post('/', detMovsEntregaRendirPComprasController.crear);
router.put('/:id', detMovsEntregaRendirPComprasController.actualizar);
router.delete('/:id', detMovsEntregaRendirPComprasController.eliminar);

export default router;
