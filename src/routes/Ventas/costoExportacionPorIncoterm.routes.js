import { Router } from 'express';
import * as costoExportacionPorIncotermController from '../../controllers/Ventas/costoExportacionPorIncoterm.controller.js';

const router = Router();

// Rutas CRUD para CostoExportacionPorIncoterm
router.get('/', costoExportacionPorIncotermController.listar);
router.get('/incoterm/:incotermId', costoExportacionPorIncotermController.obtenerPorIncoterm);
router.get('/incoterm/:incotermId/vendedor', costoExportacionPorIncotermController.obtenerCostosVendedorPorIncoterm);
router.get('/:id', costoExportacionPorIncotermController.obtenerPorId);
router.post('/', costoExportacionPorIncotermController.crear);
router.put('/:id', costoExportacionPorIncotermController.actualizar);
router.delete('/:id', costoExportacionPorIncotermController.eliminar);

export default router;
