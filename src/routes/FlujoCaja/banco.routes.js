import { Router } from 'express';
import * as bancoController from '../../controllers/FlujoCaja/banco.controller.js';

const router = Router();

// Rutas CRUD para Banco
router.get('/', bancoController.listar);
router.get('/:id', bancoController.obtenerPorId);
router.post('/', bancoController.crear);
router.put('/:id', bancoController.actualizar);
router.delete('/:id', bancoController.eliminar);

export default router;
