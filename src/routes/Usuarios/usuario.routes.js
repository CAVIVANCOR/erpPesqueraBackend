import { Router } from 'express';
import * as usuarioController from '../../controllers/Usuarios/usuario.controller.js';

const router = Router();

// Rutas CRUD para Usuario
router.get('/', usuarioController.listar);
router.get('/:id', usuarioController.obtenerPorId);
router.post('/', usuarioController.crear);
router.put('/:id', usuarioController.actualizar);
router.delete('/:id', usuarioController.eliminar);

export default router;
