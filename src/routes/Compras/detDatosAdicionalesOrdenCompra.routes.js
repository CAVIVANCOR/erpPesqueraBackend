import { Router } from 'express';
import * as detDatosAdicionalesOrdenCompraController from '../../controllers/Compras/detDatosAdicionalesOrdenCompra.controller.js';

const router = Router();

// Rutas CRUD para DetDatosAdicionalesOrdenCompra
router.get('/', detDatosAdicionalesOrdenCompraController.listar);
router.get('/:id', detDatosAdicionalesOrdenCompraController.obtenerPorId);
router.post('/', detDatosAdicionalesOrdenCompraController.crear);
router.put('/:id', detDatosAdicionalesOrdenCompraController.actualizar);
router.delete('/:id', detDatosAdicionalesOrdenCompraController.eliminar);

export default router;
