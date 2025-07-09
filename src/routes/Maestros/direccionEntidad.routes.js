import { Router } from 'express';
import * as direccionEntidadController from '../../controllers/Maestros/direccionEntidad.controller.js';

const router = Router();

// Rutas CRUD para DireccionEntidad
router.get('/', direccionEntidadController.listar);
router.get('/:id', direccionEntidadController.obtenerPorId);
router.post('/', direccionEntidadController.crear);
router.put('/:id', direccionEntidadController.actualizar);
router.delete('/:id', direccionEntidadController.eliminar);

export default router;
