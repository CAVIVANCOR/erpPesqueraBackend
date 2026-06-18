import { Router } from 'express';
import * as categoriaTipoDeudaTributariaController from '../../controllers/Tesoreria/categoriaTipoDeudaTributaria.controller.js';

const router = Router();

router.get('/', categoriaTipoDeudaTributariaController.listar);
router.get('/activos', categoriaTipoDeudaTributariaController.listarActivos);
router.get('/:id', categoriaTipoDeudaTributariaController.obtenerPorId);
router.post('/', categoriaTipoDeudaTributariaController.crear);
router.put('/:id', categoriaTipoDeudaTributariaController.actualizar);
router.delete('/:id', categoriaTipoDeudaTributariaController.eliminar);

export default router;