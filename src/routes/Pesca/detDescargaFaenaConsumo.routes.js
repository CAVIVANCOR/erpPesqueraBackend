import { Router } from 'express';
import * as detDescargaFaenaConsumoController from '../../controllers/Pesca/detDescargaFaenaConsumo.controller.js';

const router = Router();

// Rutas CRUD para DetDescargaFaenaConsumo
router.get('/', detDescargaFaenaConsumoController.listar);
router.get('/:id', detDescargaFaenaConsumoController.obtenerPorId);
router.post('/', detDescargaFaenaConsumoController.crear);
router.put('/:id', detDescargaFaenaConsumoController.actualizar);
router.delete('/:id', detDescargaFaenaConsumoController.eliminar);

export default router;
