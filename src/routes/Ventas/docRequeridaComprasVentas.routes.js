import { Router } from 'express';
import * as docRequeridaComprasVentasController from '../../controllers/Ventas/docRequeridaComprasVentas.controller.js';

const router = Router();

// Rutas CRUD para DocRequeridaComprasVentas
router.get('/', docRequeridaComprasVentasController.listar);
router.get('/:id', docRequeridaComprasVentasController.obtenerPorId);
router.post('/', docRequeridaComprasVentasController.crear);
router.put('/:id', docRequeridaComprasVentasController.actualizar);
router.delete('/:id', docRequeridaComprasVentasController.eliminar);

export default router;
