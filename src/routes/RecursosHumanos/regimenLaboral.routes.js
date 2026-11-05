import { Router } from 'express';
import * as regimenLaboralController from '../../controllers/RecursosHumanos/regimenLaboral.controller.js';

const router = Router();

router.get('/', regimenLaboralController.listar);
router.get('/activos', regimenLaboralController.listarActivos);
router.get('/:id', regimenLaboralController.obtenerPorId);
router.post('/', regimenLaboralController.crear);
router.put('/:id', regimenLaboralController.actualizar);
router.delete('/:id', regimenLaboralController.eliminar);

export default router;
