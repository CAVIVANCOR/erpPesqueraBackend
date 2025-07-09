import { Router } from 'express';
import * as tiposDocIdentidadController from '../../controllers/Maestros/tiposDocIdentidad.controller.js';

const router = Router();

// Rutas CRUD para TiposDocIdentidad
router.get('/', tiposDocIdentidadController.listar);
router.get('/:id', tiposDocIdentidadController.obtenerPorId);
router.post('/', tiposDocIdentidadController.crear);
router.put('/:id', tiposDocIdentidadController.actualizar);
router.delete('/:id', tiposDocIdentidadController.eliminar);

export default router;
