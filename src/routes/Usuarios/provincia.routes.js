import { Router } from 'express';
import * as provinciaController from '../../controllers/Usuarios/provincia.controller.js';

const router = Router();

// Rutas CRUD para Provincia
router.get('/', provinciaController.listar);
router.get('/:id', provinciaController.obtenerPorId);
router.post('/', provinciaController.crear);
router.put('/:id', provinciaController.actualizar);
router.delete('/:id', provinciaController.eliminar);

export default router;
