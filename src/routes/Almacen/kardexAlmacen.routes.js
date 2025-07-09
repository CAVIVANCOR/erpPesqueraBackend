import { Router } from 'express';
import * as kardexAlmacenController from '../../controllers/Almacen/kardexAlmacen.controller.js';

const router = Router();

// Rutas CRUD para KardexAlmacen
router.get('/', kardexAlmacenController.listar);
router.get('/:id', kardexAlmacenController.obtenerPorId);
router.post('/', kardexAlmacenController.crear);
router.put('/:id', kardexAlmacenController.actualizar);
router.delete('/:id', kardexAlmacenController.eliminar);

export default router;
