import { Router } from 'express';
import * as kardexAlmacenController from '../../controllers/Almacen/kardexAlmacen.controller.js';

const router = Router();

// Rutas profesionales para consultar kardex
router.get('/producto', kardexAlmacenController.obtenerKardexPorProducto);
router.get('/movimiento/:movimientoId', kardexAlmacenController.obtenerKardexPorMovimiento);
router.get('/cliente', kardexAlmacenController.obtenerKardexPorCliente);
router.get('/saldos-detallados', kardexAlmacenController.obtenerSaldosDetallados);
router.get('/saldos-generales', kardexAlmacenController.obtenerSaldosGenerales);
router.get('/reporte', kardexAlmacenController.obtenerReporteKardex);

export default router;
