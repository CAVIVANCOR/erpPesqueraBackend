import { Router } from 'express';
import * as tipoContenedorController from '../../controllers/Ventas/tipoContenedor.controller.js';

const router = Router();

// Rutas CRUD para TipoContenedor
router.get('/', tipoContenedorController.listar);
router.get('/:id', tipoContenedorController.obtenerPorId);
router.post('/', tipoContenedorController.crear);
router.put('/:id', tipoContenedorController.actualizar);
router.delete('/:id', tipoContenedorController.eliminar);

export default router;