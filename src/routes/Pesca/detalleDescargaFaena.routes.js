import { Router } from 'express';
import * as detalleDescargaFaenaController from '../../controllers/Pesca/detalleDescargaFaena.controller.js';

const router = Router();

// Rutas CRUD para DetalleDescargaFaena
router.get('/', detalleDescargaFaenaController.listar);
router.get('/:id', detalleDescargaFaenaController.obtenerPorId);
router.post('/', detalleDescargaFaenaController.crear);
router.put('/:id', detalleDescargaFaenaController.actualizar);
router.delete('/:id', detalleDescargaFaenaController.eliminar);

export default router;
