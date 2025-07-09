import { Router } from 'express';
import * as documentacionPersonalController from '../../controllers/Usuarios/documentacionPersonal.controller.js';

const router = Router();

// Rutas CRUD para DocumentacionPersonal
router.get('/', documentacionPersonalController.listar);
router.get('/:id', documentacionPersonalController.obtenerPorId);
router.post('/', documentacionPersonalController.crear);
router.put('/:id', documentacionPersonalController.actualizar);
router.delete('/:id', documentacionPersonalController.eliminar);

export default router;
