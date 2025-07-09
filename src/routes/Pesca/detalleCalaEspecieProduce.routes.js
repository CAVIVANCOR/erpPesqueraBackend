import { Router } from 'express';
import * as detalleCalaEspecieProduceController from '../../controllers/Pesca/detalleCalaEspecieProduce.controller.js';

const router = Router();

// Rutas CRUD para DetalleCalaEspecieProduce
router.get('/', detalleCalaEspecieProduceController.listar);
router.get('/:id', detalleCalaEspecieProduceController.obtenerPorId);
router.post('/', detalleCalaEspecieProduceController.crear);
router.put('/:id', detalleCalaEspecieProduceController.actualizar);
router.delete('/:id', detalleCalaEspecieProduceController.eliminar);

export default router;
