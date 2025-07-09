import { Router } from 'express';
import * as calaProduceController from '../../controllers/Pesca/calaProduce.controller.js';

const router = Router();

// Rutas CRUD para CalaProduce
router.get('/', calaProduceController.listar);
router.get('/:id', calaProduceController.obtenerPorId);
router.post('/', calaProduceController.crear);
router.put('/:id', calaProduceController.actualizar);
router.delete('/:id', calaProduceController.eliminar);

export default router;
