import { Router } from 'express';
import * as requerimientoCompraController from '../../controllers/Compras/requerimientoCompra.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/series-doc', requerimientoCompraController.obtenerSeriesDoc);

// Rutas CRUD para RequerimientoCompra
router.get('/', requerimientoCompraController.listar);
router.get('/:id', requerimientoCompraController.obtenerPorId);
router.post('/', requerimientoCompraController.crear);
router.put('/:id', requerimientoCompraController.actualizar);
router.delete('/:id', requerimientoCompraController.eliminar);

// Rutas para operaciones de aprobación, anulación y autorización
router.post('/:id/aprobar', requerimientoCompraController.aprobar);
router.post('/:id/anular', requerimientoCompraController.anular);
router.post('/:id/autorizar-compra', requerimientoCompraController.autorizarCompra);

export default router;