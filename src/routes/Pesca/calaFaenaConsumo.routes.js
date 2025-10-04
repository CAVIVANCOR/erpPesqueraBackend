import { Router } from 'express';
import * as calaFaenaConsumoController from '../../controllers/Pesca/calaFaenaConsumo.controller.js';

const router = Router();

// Rutas CRUD para CalaFaenaConsumo
router.get('/', calaFaenaConsumoController.listar);
router.get('/faena/:faenaId', calaFaenaConsumoController.obtenerPorFaena);
router.get('/:id', calaFaenaConsumoController.obtenerPorId);
router.post('/', calaFaenaConsumoController.crear);
router.put('/:id', calaFaenaConsumoController.actualizar);
router.delete('/:id', calaFaenaConsumoController.eliminar);

export default router;