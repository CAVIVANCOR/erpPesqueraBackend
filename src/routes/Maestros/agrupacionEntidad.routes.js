import { Router } from 'express';
import * as agrupacionEntidadController from '../../controllers/Maestros/agrupacionEntidad.controller.js';

const router = Router();

// Rutas CRUD para AgrupacionEntidad
router.get('/', agrupacionEntidadController.listar);
router.get('/:id', agrupacionEntidadController.obtenerPorId);
router.post('/', agrupacionEntidadController.crear);
router.put('/:id', agrupacionEntidadController.actualizar);
router.delete('/:id', agrupacionEntidadController.eliminar);

export default router;
