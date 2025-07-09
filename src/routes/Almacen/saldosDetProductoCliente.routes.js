import { Router } from 'express';
import * as saldosDetProductoClienteController from '../../controllers/Almacen/saldosDetProductoCliente.controller.js';

const router = Router();

// Rutas CRUD para SaldosDetProductoCliente
router.get('/', saldosDetProductoClienteController.listar);
router.get('/:id', saldosDetProductoClienteController.obtenerPorId);
router.post('/', saldosDetProductoClienteController.crear);
router.put('/:id', saldosDetProductoClienteController.actualizar);
router.delete('/:id', saldosDetProductoClienteController.eliminar);

export default router;
