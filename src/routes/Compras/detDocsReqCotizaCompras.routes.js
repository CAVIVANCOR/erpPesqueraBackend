import { Router } from 'express';
import * as detDocsReqCotizaComprasController from '../../controllers/Compras/detDocsReqCotizaCompras.controller.js';

const router = Router();

// Rutas CRUD para DetDocsReqCotizaCompras
router.get('/', detDocsReqCotizaComprasController.listar);
router.get('/:id', detDocsReqCotizaComprasController.obtenerPorId);
router.post('/', detDocsReqCotizaComprasController.crear);
router.put('/:id', detDocsReqCotizaComprasController.actualizar);
router.delete('/:id', detDocsReqCotizaComprasController.eliminar);

export default router;
