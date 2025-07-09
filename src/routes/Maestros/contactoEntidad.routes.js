import { Router } from 'express';
import * as contactoEntidadController from '../../controllers/Maestros/contactoEntidad.controller.js';

const router = Router();

// Rutas CRUD para ContactoEntidad
router.get('/', contactoEntidadController.listar);
router.get('/:id', contactoEntidadController.obtenerPorId);
router.post('/', contactoEntidadController.crear);
router.put('/:id', contactoEntidadController.actualizar);
router.delete('/:id', contactoEntidadController.eliminar);

export default router;
