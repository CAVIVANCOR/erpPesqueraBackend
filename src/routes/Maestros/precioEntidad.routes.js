import { Router } from 'express';
import * as precioEntidadController from '../../controllers/Maestros/precioEntidad.controller.js';

const router = Router();

// Rutas CRUD para PrecioEntidad
router.get('/', precioEntidadController.listar);
router.get('/:id', precioEntidadController.obtenerPorId);
router.post('/', precioEntidadController.crear);
router.put('/:id', precioEntidadController.actualizar);
router.delete('/:id', precioEntidadController.eliminar);

export default router;
