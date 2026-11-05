import { Router } from 'express';
import * as entidadPensionController from '../../controllers/RecursosHumanos/entidadPension.controller.js';

const router = Router();

router.get('/', entidadPensionController.listar);
router.get('/activos', entidadPensionController.listarActivos);
router.get('/:id', entidadPensionController.obtenerPorId);
router.post('/', entidadPensionController.crear);
router.put('/:id', entidadPensionController.actualizar);
router.delete('/:id', entidadPensionController.eliminar);

export default router;
