import { Router } from 'express';
import * as detCotizacionVentasController from '../../controllers/Ventas/detCotizacionVentas.controller.js';

const router = Router();

// Rutas CRUD para DetCotizacionVentas
router.get('/', detCotizacionVentasController.listar);
router.get('/:id', detCotizacionVentasController.obtenerPorId);
router.post('/', detCotizacionVentasController.crear);
router.put('/:id', detCotizacionVentasController.actualizar);
router.delete('/:id', detCotizacionVentasController.eliminar);

export default router;
