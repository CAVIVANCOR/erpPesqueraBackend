import { Router } from 'express';
import * as tipoDeudaTributariaController from '../../controllers/Tesoreria/tipoDeudaTributaria.controller.js';

const router = Router();

router.get('/', tipoDeudaTributariaController.listar);
router.get('/activos', tipoDeudaTributariaController.listarActivos);
router.get('/:id', tipoDeudaTributariaController.obtenerPorId);
router.post('/', tipoDeudaTributariaController.crear);
router.put('/:id', tipoDeudaTributariaController.actualizar);
router.delete('/:id', tipoDeudaTributariaController.eliminar);

export default router;