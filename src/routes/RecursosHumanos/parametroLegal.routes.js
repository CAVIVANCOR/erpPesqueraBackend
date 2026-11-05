import { Router } from 'express';
import * as parametroLegalController from '../../controllers/RecursosHumanos/parametroLegal.controller.js';

const router = Router();

router.get('/', parametroLegalController.listar);
router.get('/vigentes', parametroLegalController.obtenerVigentes);
router.get('/:id', parametroLegalController.obtenerPorId);
router.post('/', parametroLegalController.crear);
router.put('/:id', parametroLegalController.actualizar);
router.delete('/:id', parametroLegalController.eliminar);

export default router;
