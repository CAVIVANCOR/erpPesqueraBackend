import { Router } from 'express';
import * as tipoDeudaPersonalController from '../../controllers/Tesoreria/tipoDeudaPersonal.controller.js';

const router = Router();

router.get('/', tipoDeudaPersonalController.listar);
router.get('/activos', tipoDeudaPersonalController.listarActivos);
router.get('/:id', tipoDeudaPersonalController.obtenerPorId);
router.post('/', tipoDeudaPersonalController.crear);
router.put('/:id', tipoDeudaPersonalController.actualizar);
router.delete('/:id', tipoDeudaPersonalController.eliminar);

export default router;