import { Router } from 'express';
import * as departamentoController from '../../controllers/Usuarios/departamento.controller.js';

const router = Router();

// Rutas CRUD para Departamento
router.get('/', departamentoController.listar);
router.get('/:id', departamentoController.obtenerPorId);
router.post('/', departamentoController.crear);
router.put('/:id', departamentoController.actualizar);
router.delete('/:id', departamentoController.eliminar);

export default router;
