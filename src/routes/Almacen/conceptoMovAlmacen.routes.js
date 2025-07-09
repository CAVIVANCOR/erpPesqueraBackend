import { Router } from 'express';
import * as conceptoMovAlmacenController from '../../controllers/Almacen/conceptoMovAlmacen.controller.js';

const router = Router();

// Rutas CRUD para ConceptoMovAlmacen
router.get('/', conceptoMovAlmacenController.listar);
router.get('/:id', conceptoMovAlmacenController.obtenerPorId);
router.post('/', conceptoMovAlmacenController.crear);
router.put('/:id', conceptoMovAlmacenController.actualizar);
router.delete('/:id', conceptoMovAlmacenController.eliminar);

export default router;
