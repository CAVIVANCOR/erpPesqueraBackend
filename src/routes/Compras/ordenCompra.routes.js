import { Router } from 'express';
import * as ordenCompraController from '../../controllers/Compras/ordenCompra.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.post('/generar-desde-requerimiento', ordenCompraController.generarDesdeRequerimiento);

// Rutas CRUD para OrdenCompra
router.get('/', ordenCompraController.listar);
router.get('/:id', ordenCompraController.obtenerPorId);
router.post('/', ordenCompraController.crear);
router.put('/:id', ordenCompraController.actualizar);
router.delete('/:id', ordenCompraController.eliminar);

// Rutas para operaciones especiales
router.post('/:id/aprobar', ordenCompraController.aprobar);
router.post('/:id/anular', ordenCompraController.anular);
router.post('/:id/generar-movimiento', ordenCompraController.generarMovimiento);

export default router;