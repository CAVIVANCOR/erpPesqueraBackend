import { Router } from 'express';
import * as familiaProductoController from '../../controllers/Maestros/familiaProducto.controller.js';

const router = Router();

// Rutas CRUD para FamiliaProducto
router.get('/', familiaProductoController.listar);
router.get('/:id', familiaProductoController.obtenerPorId);
router.post('/', familiaProductoController.crear);
router.put('/:id', familiaProductoController.actualizar);
router.delete('/:id', familiaProductoController.eliminar);

export default router;
