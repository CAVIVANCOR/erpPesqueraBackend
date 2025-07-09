import { Router } from 'express';
import * as movimientoAlmacenController from '../../controllers/Almacen/movimientoAlmacen.controller.js';

const router = Router();

// Rutas CRUD para MovimientoAlmacen
router.get('/', movimientoAlmacenController.listar);
router.get('/:id', movimientoAlmacenController.obtenerPorId);
router.post('/', movimientoAlmacenController.crear);
router.put('/:id', movimientoAlmacenController.actualizar);
router.delete('/:id', movimientoAlmacenController.eliminar);

export default router;
