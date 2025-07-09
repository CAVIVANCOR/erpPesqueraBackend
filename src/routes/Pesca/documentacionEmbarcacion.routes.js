import { Router } from 'express';
import * as documentacionEmbarcacionController from '../../controllers/Pesca/documentacionEmbarcacion.controller.js';

const router = Router();

// Rutas CRUD para DocumentacionEmbarcacion
router.get('/', documentacionEmbarcacionController.listar);
router.get('/:id', documentacionEmbarcacionController.obtenerPorId);
router.post('/', documentacionEmbarcacionController.crear);
router.put('/:id', documentacionEmbarcacionController.actualizar);
router.delete('/:id', documentacionEmbarcacionController.eliminar);

export default router;
