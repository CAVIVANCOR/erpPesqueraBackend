import { Router } from 'express';
import * as saldosProductoClienteController from '../../controllers/Almacen/saldosProductoCliente.controller.js';

const router = Router();

// Rutas CRUD para SaldosProductoCliente
router.get('/', saldosProductoClienteController.listar);
router.get('/:id', saldosProductoClienteController.obtenerPorId);
router.post('/', saldosProductoClienteController.crear);
router.put('/:id', saldosProductoClienteController.actualizar);
router.delete('/:id', saldosProductoClienteController.eliminar);

export default router;
