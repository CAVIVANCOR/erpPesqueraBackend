import { Router } from 'express';
import * as tipoAlmacenController from '../../controllers/Almacen/tipoAlmacen.controller.js';

const router = Router();

// Rutas CRUD para TipoAlmacen
router.get('/', tipoAlmacenController.listar);
router.get('/:id', tipoAlmacenController.obtenerPorId);
router.post('/', tipoAlmacenController.crear);
router.put('/:id', tipoAlmacenController.actualizar);
router.delete('/:id', tipoAlmacenController.eliminar);

export default router;
