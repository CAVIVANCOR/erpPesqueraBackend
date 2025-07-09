import { Router } from 'express';
import * as detalleDocTripulantesController from '../../controllers/Pesca/detalleDocTripulantes.controller.js';

const router = Router();

// Rutas CRUD para DetalleDocTripulantes
router.get('/', detalleDocTripulantesController.listar);
router.get('/:id', detalleDocTripulantesController.obtenerPorId);
router.post('/', detalleDocTripulantesController.crear);
router.put('/:id', detalleDocTripulantesController.actualizar);
router.delete('/:id', detalleDocTripulantesController.eliminar);

export default router;
