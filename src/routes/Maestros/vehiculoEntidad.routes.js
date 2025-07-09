import { Router } from 'express';
import * as vehiculoEntidadController from '../../controllers/Maestros/vehiculoEntidad.controller.js';

const router = Router();

// Rutas CRUD para VehiculoEntidad
router.get('/', vehiculoEntidadController.listar);
router.get('/:id', vehiculoEntidadController.obtenerPorId);
router.post('/', vehiculoEntidadController.crear);
router.put('/:id', vehiculoEntidadController.actualizar);
router.delete('/:id', vehiculoEntidadController.eliminar);

export default router;
