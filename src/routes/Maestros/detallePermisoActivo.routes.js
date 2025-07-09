import { Router } from 'express';
import * as detallePermisoActivoController from '../../controllers/Maestros/detallePermisoActivo.controller.js';

const router = Router();

// Rutas CRUD para DetallePermisoActivo
router.get('/', detallePermisoActivoController.listar);
router.get('/:id', detallePermisoActivoController.obtenerPorId);
router.post('/', detallePermisoActivoController.crear);
router.put('/:id', detallePermisoActivoController.actualizar);
router.delete('/:id', detallePermisoActivoController.eliminar);

export default router;
