import { Router } from 'express';
import * as detCalaFaenaConsumoProduceController from '../../controllers/Pesca/detCalaFaenaConsumoProduce.controller.js';

const router = Router();

// Rutas CRUD para DetCalaFaenaConsumoProduce
router.get('/', detCalaFaenaConsumoProduceController.listar);
router.get('/:id', detCalaFaenaConsumoProduceController.obtenerPorId);
router.post('/', detCalaFaenaConsumoProduceController.crear);
router.put('/:id', detCalaFaenaConsumoProduceController.actualizar);
router.delete('/:id', detCalaFaenaConsumoProduceController.eliminar);

export default router;
