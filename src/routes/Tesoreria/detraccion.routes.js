import { Router } from 'express';
import * as detraccionController from '../../controllers/Tesoreria/detraccion.controller.js';

const router = Router();

router.get('/', detraccionController.listar);
router.get('/:id', detraccionController.obtenerPorId);
router.post('/', detraccionController.crear);
router.put('/:id', detraccionController.actualizar);
router.delete('/:id', detraccionController.eliminar);

export default router;