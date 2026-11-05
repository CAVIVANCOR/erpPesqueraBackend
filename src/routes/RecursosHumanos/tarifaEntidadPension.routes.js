import { Router } from 'express';
import * as tarifaEntidadPensionController from '../../controllers/RecursosHumanos/tarifaEntidadPension.controller.js';

const router = Router();

router.get('/', tarifaEntidadPensionController.listar);
router.get('/vigentes', tarifaEntidadPensionController.obtenerVigentes);
router.get('/:id', tarifaEntidadPensionController.obtenerPorId);
router.post('/', tarifaEntidadPensionController.crear);
router.put('/:id', tarifaEntidadPensionController.actualizar);
router.delete('/:id', tarifaEntidadPensionController.eliminar);

export default router;
