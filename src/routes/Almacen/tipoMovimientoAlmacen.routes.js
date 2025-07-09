import { Router } from 'express';
import * as tipoMovimientoAlmacenController from '../../controllers/Almacen/tipoMovimientoAlmacen.controller.js';

const router = Router();

// Rutas CRUD para TipoMovimientoAlmacen
router.get('/', tipoMovimientoAlmacenController.listar);
router.get('/:id', tipoMovimientoAlmacenController.obtenerPorId);
router.post('/', tipoMovimientoAlmacenController.crear);
router.put('/:id', tipoMovimientoAlmacenController.actualizar);
router.delete('/:id', tipoMovimientoAlmacenController.eliminar);

export default router;
