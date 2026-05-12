import { Router } from 'express';
import * as detContratistasOTController from '../../controllers/Mantenimiento/detContratistasOT.controller.js';

const router = Router();

// Rutas CRUD para DetContratistasOT
router.get('/', detContratistasOTController.listar);
router.get('/orden-trabajo/:otId', detContratistasOTController.listarPorOrdenTrabajo);
router.get('/:id', detContratistasOTController.obtenerPorId);
router.post('/', detContratistasOTController.crear);
router.put('/:id', detContratistasOTController.actualizar);
router.delete('/:id', detContratistasOTController.eliminar);

export default router;