import { Router } from 'express';
import * as cotizacionComprasController from '../../controllers/Compras/cotizacionCompras.controller.js';

const router = Router();

// Rutas CRUD para CotizacionCompras
router.get('/', cotizacionComprasController.listar);
router.get('/:id', cotizacionComprasController.obtenerPorId);
router.post('/', cotizacionComprasController.crear);
router.put('/:id', cotizacionComprasController.actualizar);
router.delete('/:id', cotizacionComprasController.eliminar);

export default router;
