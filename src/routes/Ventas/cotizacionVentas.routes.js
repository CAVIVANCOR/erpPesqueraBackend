import { Router } from 'express';
import * as cotizacionVentasController from '../../controllers/Ventas/cotizacionVentas.controller.js';

const router = Router();

// Rutas CRUD para CotizacionVentas
router.get('/', cotizacionVentasController.listar);
router.get('/:id', cotizacionVentasController.obtenerPorId);
router.post('/', cotizacionVentasController.crear);
router.put('/:id', cotizacionVentasController.actualizar);
router.delete('/:id', cotizacionVentasController.eliminar);

export default router;
