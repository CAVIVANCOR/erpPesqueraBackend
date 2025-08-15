import { Router } from 'express';
import * as lineaCreditoEntidadController from '../../controllers/Maestros/lineaCreditoEntidad.controller.js';

const router = Router();

// Rutas CRUD para LineaCreditoEntidad
router.get('/', lineaCreditoEntidadController.listar);
router.get('/entidad/:entidadComercialId', lineaCreditoEntidadController.obtenerPorEntidad);
router.get('/:id', lineaCreditoEntidadController.obtenerPorId);
router.post('/', lineaCreditoEntidadController.crear);
router.put('/:id', lineaCreditoEntidadController.actualizar);
router.delete('/:id', lineaCreditoEntidadController.eliminar);

export default router;
