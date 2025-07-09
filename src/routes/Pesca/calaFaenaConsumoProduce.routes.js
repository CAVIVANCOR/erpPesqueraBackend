import { Router } from 'express';
import * as calaFaenaConsumoProduceController from '../../controllers/Pesca/calaFaenaConsumoProduce.controller.js';

const router = Router();

// Rutas CRUD para CalaFaenaConsumoProduce
router.get('/', calaFaenaConsumoProduceController.listar);
router.get('/:id', calaFaenaConsumoProduceController.obtenerPorId);
router.post('/', calaFaenaConsumoProduceController.crear);
router.put('/:id', calaFaenaConsumoProduceController.actualizar);
router.delete('/:id', calaFaenaConsumoProduceController.eliminar);

export default router;
