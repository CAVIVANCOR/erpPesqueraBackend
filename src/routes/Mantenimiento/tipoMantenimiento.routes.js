import { Router } from 'express';
import * as tipoMantenimientoController from '../../controllers/Mantenimiento/tipoMantenimiento.controller.js';

const router = Router();

// Rutas CRUD para TipoMantenimiento
router.get('/', tipoMantenimientoController.listar);
router.get('/:id', tipoMantenimientoController.obtenerPorId);
router.post('/', tipoMantenimientoController.crear);
router.put('/:id', tipoMantenimientoController.actualizar);
router.delete('/:id', tipoMantenimientoController.eliminar);

export default router;
