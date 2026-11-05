import { Router } from 'express';
import * as contratoPersonalController from '../../controllers/RecursosHumanos/contratoPersonal.controller.js';

const router = Router();

router.get('/', contratoPersonalController.listar);
router.get('/:id', contratoPersonalController.obtenerPorId);
router.post('/', contratoPersonalController.crear);
router.put('/:id', contratoPersonalController.actualizar);
router.delete('/:id', contratoPersonalController.eliminar);

export default router;
