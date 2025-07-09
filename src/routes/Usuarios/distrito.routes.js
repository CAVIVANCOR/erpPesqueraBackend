import { Router } from 'express';
import * as distritoController from '../../controllers/Usuarios/distrito.controller.js';

const router = Router();

// Rutas CRUD para Distrito
router.get('/', distritoController.listar);
router.get('/:id', distritoController.obtenerPorId);
router.post('/', distritoController.crear);
router.put('/:id', distritoController.actualizar);
router.delete('/:id', distritoController.eliminar);

export default router;
