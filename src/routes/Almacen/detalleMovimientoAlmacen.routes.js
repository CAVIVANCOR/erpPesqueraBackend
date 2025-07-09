import { Router } from 'express';
import * as detalleMovimientoAlmacenController from '../../controllers/Almacen/detalleMovimientoAlmacen.controller.js';

const router = Router();

// Rutas CRUD para DetalleMovimientoAlmacen
router.get('/', detalleMovimientoAlmacenController.listar);
router.get('/:id', detalleMovimientoAlmacenController.obtenerPorId);
router.post('/', detalleMovimientoAlmacenController.crear);
router.put('/:id', detalleMovimientoAlmacenController.actualizar);
router.delete('/:id', detalleMovimientoAlmacenController.eliminar);

export default router;
