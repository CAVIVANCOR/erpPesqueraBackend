import { Router } from 'express';
import * as almacenController from '../../controllers/Almacen/almacen.controller.js';

const router = Router();

// Rutas CRUD para Almacen
router.get('/', almacenController.listar);
router.get('/:id', almacenController.obtenerPorId);
router.post('/', almacenController.crear);
router.put('/:id', almacenController.actualizar);
router.delete('/:id', almacenController.eliminar);

export default router;