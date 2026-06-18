import { Router } from 'express';
import * as categoriaTipoDeudaPersonalController from '../../controllers/Tesoreria/categoriaTipoDeudaPersonal.controller.js';

const router = Router();

router.get('/', categoriaTipoDeudaPersonalController.listar);
router.get('/activos', categoriaTipoDeudaPersonalController.listarActivos);
router.get('/:id', categoriaTipoDeudaPersonalController.obtenerPorId);
router.post('/', categoriaTipoDeudaPersonalController.crear);
router.put('/:id', categoriaTipoDeudaPersonalController.actualizar);
router.delete('/:id', categoriaTipoDeudaPersonalController.eliminar);

export default router;