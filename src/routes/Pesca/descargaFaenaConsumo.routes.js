import { Router } from 'express';
import * as descargaFaenaConsumoController from '../../controllers/Pesca/descargaFaenaConsumo.controller.js';

const router = Router();

// Rutas CRUD para DescargaFaenaConsumo
router.get('/', descargaFaenaConsumoController.listar);
router.get('/:id', descargaFaenaConsumoController.obtenerPorId);
router.post('/', descargaFaenaConsumoController.crear);
router.put('/:id', descargaFaenaConsumoController.actualizar);
router.delete('/:id', descargaFaenaConsumoController.eliminar);

export default router;
