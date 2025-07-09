import { Router } from 'express';
import * as tipoActivoController from '../../controllers/Maestros/tipoActivo.controller.js';

const router = Router();

// Rutas CRUD para TipoActivo
router.get('/', tipoActivoController.listar);
router.get('/:id', tipoActivoController.obtenerPorId);
router.post('/', tipoActivoController.crear);
router.put('/:id', tipoActivoController.actualizar);
router.delete('/:id', tipoActivoController.eliminar);

export default router;
