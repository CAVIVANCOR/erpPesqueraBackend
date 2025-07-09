import { Router } from 'express';
import * as detCotizacionComprasController from '../../controllers/Compras/detCotizacionCompras.controller.js';

const router = Router();

// Rutas CRUD para DetCotizacionCompras
router.get('/', detCotizacionComprasController.listar);
router.get('/:id', detCotizacionComprasController.obtenerPorId);
router.post('/', detCotizacionComprasController.crear);
router.put('/:id', detCotizacionComprasController.actualizar);
router.delete('/:id', detCotizacionComprasController.eliminar);

export default router;
