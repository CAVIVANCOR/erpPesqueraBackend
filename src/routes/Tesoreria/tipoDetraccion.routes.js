import { Router } from 'express';
import * as tipoDetraccionController from '../../controllers/Tesoreria/tipoDetraccion.controller.js';

const router = Router();

router.get('/', tipoDetraccionController.listar);
router.get('/activos', tipoDetraccionController.listarActivos);
router.get('/:id', tipoDetraccionController.obtenerPorId);
router.post('/', tipoDetraccionController.crear);
router.put('/:id', tipoDetraccionController.actualizar);
router.delete('/:id', tipoDetraccionController.eliminar);

export default router;