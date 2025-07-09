import { Router } from 'express';
import * as movLiquidacionProcesoComprasProdController from '../../controllers/Compras/movLiquidacionProcesoComprasProd.controller.js';

const router = Router();

// Rutas CRUD para MovLiquidacionProcesoComprasProd
router.get('/', movLiquidacionProcesoComprasProdController.listar);
router.get('/:id', movLiquidacionProcesoComprasProdController.obtenerPorId);
router.post('/', movLiquidacionProcesoComprasProdController.crear);
router.put('/:id', movLiquidacionProcesoComprasProdController.actualizar);
router.delete('/:id', movLiquidacionProcesoComprasProdController.eliminar);

export default router;
