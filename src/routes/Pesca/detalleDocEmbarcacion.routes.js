import { Router } from 'express';
import * as detalleDocEmbarcacionController from '../../controllers/Pesca/detalleDocEmbarcacion.controller.js';

const router = Router();

// Rutas CRUD para DetalleDocEmbarcacion
router.get('/', detalleDocEmbarcacionController.listar);
router.get('/:id', detalleDocEmbarcacionController.obtenerPorId);
router.post('/', detalleDocEmbarcacionController.crear);
router.put('/:id', detalleDocEmbarcacionController.actualizar);
router.delete('/:id', detalleDocEmbarcacionController.eliminar);

export default router;
