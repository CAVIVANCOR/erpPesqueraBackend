import { Router } from 'express';
import * as detMovsEntregaRendirMovAlmacenController from '../../controllers/Almacen/detMovsEntregaRendirMovAlmacen.controller.js';

const router = Router();

// Rutas CRUD para DetMovsEntregaRendirMovAlmacen
router.get('/', detMovsEntregaRendirMovAlmacenController.listar);
router.get('/:id', detMovsEntregaRendirMovAlmacenController.obtenerPorId);
router.post('/', detMovsEntregaRendirMovAlmacenController.crear);
router.put('/:id', detMovsEntregaRendirMovAlmacenController.actualizar);
router.delete('/:id', detMovsEntregaRendirMovAlmacenController.eliminar);

export default router;
