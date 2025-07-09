import { Router } from 'express';
import * as detProductoFinalCotizacionComprasController from '../../controllers/Compras/detProductoFinalCotizacionCompras.controller.js';

const router = Router();

// Rutas CRUD para DetProductoFinalCotizacionCompras
router.get('/', detProductoFinalCotizacionComprasController.listar);
router.get('/:id', detProductoFinalCotizacionComprasController.obtenerPorId);
router.post('/', detProductoFinalCotizacionComprasController.crear);
router.put('/:id', detProductoFinalCotizacionComprasController.actualizar);
router.delete('/:id', detProductoFinalCotizacionComprasController.eliminar);

export default router;
