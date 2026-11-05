import { Router } from 'express';
import * as plantillaFormatoExternoController from '../../controllers/RecursosHumanos/plantillaFormatoExterno.controller.js';

const router = Router();

router.get('/', plantillaFormatoExternoController.listar);
router.get('/vigente', plantillaFormatoExternoController.obtenerVigente);
router.get('/:id', plantillaFormatoExternoController.obtenerPorId);
router.post('/', plantillaFormatoExternoController.crear);
router.put('/:id', plantillaFormatoExternoController.actualizar);
router.delete('/:id', plantillaFormatoExternoController.eliminar);

export default router;
