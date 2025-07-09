import { Router } from 'express';
import * as liquidacionProcesoComprasProdController from '../../controllers/Compras/liquidacionProcesoComprasProd.controller.js';

const router = Router();

// Rutas CRUD para LiquidacionProcesoComprasProd
router.get('/', liquidacionProcesoComprasProdController.listar);
router.get('/:id', liquidacionProcesoComprasProdController.obtenerPorId);
router.post('/', liquidacionProcesoComprasProdController.crear);
router.put('/:id', liquidacionProcesoComprasProdController.actualizar);
router.delete('/:id', liquidacionProcesoComprasProdController.eliminar);

export default router;
