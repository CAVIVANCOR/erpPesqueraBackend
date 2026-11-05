import { Router } from 'express';
import * as conceptoPlanillaController from '../../controllers/RecursosHumanos/conceptoPlanilla.controller.js';

const router = Router();

router.get('/', conceptoPlanillaController.listar);
router.get('/:id', conceptoPlanillaController.obtenerPorId);
router.post('/', conceptoPlanillaController.crear);
router.put('/:id', conceptoPlanillaController.actualizar);
router.delete('/:id', conceptoPlanillaController.eliminar);

export default router;
