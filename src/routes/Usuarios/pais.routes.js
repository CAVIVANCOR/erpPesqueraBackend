import { Router } from 'express';
import * as paisController from '../../controllers/Usuarios/pais.controller.js';

const router = Router();

// Rutas CRUD para País
router.get('/', paisController.listar);
router.get('/:id', paisController.obtenerPorId);
router.post('/', paisController.crear);
router.put('/:id', paisController.actualizar);
router.delete('/:id', paisController.eliminar);

export default router;
