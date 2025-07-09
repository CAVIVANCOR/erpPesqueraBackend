import { Router } from 'express';
import * as accesosUsuarioController from '../../controllers/Usuarios/accesosUsuario.controller.js';

const router = Router();

// Rutas CRUD para AccesosUsuario
router.get('/', accesosUsuarioController.listar);
router.get('/:id', accesosUsuarioController.obtenerPorId);
router.post('/', accesosUsuarioController.crear);
router.put('/:id', accesosUsuarioController.actualizar);
router.delete('/:id', accesosUsuarioController.eliminar);

export default router;
