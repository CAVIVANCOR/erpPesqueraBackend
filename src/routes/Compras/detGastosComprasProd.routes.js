import { Router } from 'express';
import * as detGastosComprasProdController from '../../controllers/Compras/detGastosComprasProd.controller.js';

const router = Router();

// Rutas CRUD para DetGastosComprasProd
router.get('/', detGastosComprasProdController.listar);
router.get('/:id', detGastosComprasProdController.obtenerPorId);
router.post('/', detGastosComprasProdController.crear);
router.put('/:id', detGastosComprasProdController.actualizar);
router.delete('/:id', detGastosComprasProdController.eliminar);

export default router;
