import { Router } from 'express';
import * as otMantenimientoController from '../../controllers/Mantenimiento/otMantenimiento.controller.js';

const router = Router();

// Rutas CRUD para OTMantenimiento
router.get('/', otMantenimientoController.listar);
router.get('/series-doc', otMantenimientoController.getSeriesDoc);
router.get('/:id', otMantenimientoController.obtenerPorId);
router.post('/', otMantenimientoController.crear);
router.put('/:id', otMantenimientoController.actualizar);
router.delete('/:id', otMantenimientoController.eliminar);

export default router;
