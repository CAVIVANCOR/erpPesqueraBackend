import { Router } from 'express';
import * as costosExportacionCotizacionController from '../../controllers/Ventas/costosExportacionCotizacion.controller.js';

const router = Router();

// Rutas CRUD para CostosExportacionCotizacion
router.get('/', costosExportacionCotizacionController.listar);
router.get('/cotizacion/:cotizacionVentasId', costosExportacionCotizacionController.obtenerPorCotizacion);
router.get('/cotizacion/:cotizacionVentasId/variacion', costosExportacionCotizacionController.obtenerCostosConVariacion);
router.get('/:id', costosExportacionCotizacionController.obtenerPorId);
router.post('/', costosExportacionCotizacionController.crear);
router.put('/:id', costosExportacionCotizacionController.actualizar);
router.put('/:id/monto-real', costosExportacionCotizacionController.registrarMontoReal);
router.delete('/:id', costosExportacionCotizacionController.eliminar);

export default router;