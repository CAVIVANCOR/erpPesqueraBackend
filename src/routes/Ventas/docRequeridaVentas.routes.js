import { Router } from 'express';
import * as docRequeridaVentasController from '../../controllers/Ventas/docRequeridaVentas.controller.js';

const router = Router();

// Rutas CRUD para DocRequeridaVentas
router.get('/', docRequeridaVentasController.listar);
router.get('/activos', docRequeridaVentasController.listarActivos);
router.get('/pais/:paisId', docRequeridaVentasController.obtenerPorPaisYProducto);
router.get('/:id', docRequeridaVentasController.obtenerPorId);
router.post('/', docRequeridaVentasController.crear);
router.put('/:id', docRequeridaVentasController.actualizar);
router.delete('/:id', docRequeridaVentasController.eliminar);

export default router;