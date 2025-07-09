import { Router } from 'express';
import * as detDocsReqCotizaVentasController from '../../controllers/Ventas/detDocsReqCotizaVentas.controller.js';

const router = Router();

// Rutas CRUD para detDocsReqCotizaVentas
router.get('/', detDocsReqCotizaVentasController.listar);
router.get('/:id', detDocsReqCotizaVentasController.obtenerPorId);
router.post('/', detDocsReqCotizaVentasController.crear);
router.put('/:id', detDocsReqCotizaVentasController.actualizar);
router.delete('/:id', detDocsReqCotizaVentasController.eliminar);

export default router;
