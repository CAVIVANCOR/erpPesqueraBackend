import { Router } from 'express';
import * as otMantenimientoAlmacenController from '../../controllers/Mantenimiento/otMantenimientoAlmacen.controller.js';

const router = Router();

// Rutas de integración OT Mantenimiento con Almacén

// Validación de stock
router.get('/validar-stock/tarea/:tareaId', otMantenimientoAlmacenController.validarStockTarea);
router.get('/validar-stock/ot/:otMantenimientoId', otMantenimientoAlmacenController.validarStockOT);
router.get('/stock/producto/:productoId', otMantenimientoAlmacenController.obtenerStockProducto);

// Generación de movimientos
router.post('/generar-salida/tarea/:tareaId', otMantenimientoAlmacenController.generarSalidaInsumos);

export default router;
