import { Router } from 'express';
import * as centrosAlmacenController from '../../controllers/Almacen/centrosAlmacen.controller.js';

const router = Router();

// Rutas CRUD para CentrosAlmacen
router.get('/', centrosAlmacenController.listar);
router.get('/:id', centrosAlmacenController.obtenerPorId);
router.post('/', centrosAlmacenController.crear);
router.put('/:id', centrosAlmacenController.actualizar);
router.delete('/:id', centrosAlmacenController.eliminar);

export default router;