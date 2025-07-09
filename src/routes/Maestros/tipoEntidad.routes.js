import { Router } from 'express';
import * as tipoEntidadController from '../../controllers/Maestros/tipoEntidad.controller.js';

const router = Router();

// Rutas CRUD para TipoEntidad
router.get('/', tipoEntidadController.listar);
router.get('/:id', tipoEntidadController.obtenerPorId);
router.post('/', tipoEntidadController.crear);
router.put('/:id', tipoEntidadController.actualizar);
router.delete('/:id', tipoEntidadController.eliminar);

export default router;
