import { Router } from 'express';
import * as serieDocController from '../../controllers/Almacen/serieDoc.controller.js';

const router = Router();

// Rutas CRUD para SerieDoc
router.get('/', serieDocController.listar);
router.get('/:id', serieDocController.obtenerPorId);
router.post('/', serieDocController.crear);
router.put('/:id', serieDocController.actualizar);
router.delete('/:id', serieDocController.eliminar);

export default router;
