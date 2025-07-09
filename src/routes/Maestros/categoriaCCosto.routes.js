import { Router } from 'express';
import * as categoriaCCostoController from '../../controllers/Maestros/categoriaCCosto.controller.js';

const router = Router();

// Rutas CRUD para CategoriaCCosto
router.get('/', categoriaCCostoController.listar);
router.get('/:id', categoriaCCostoController.obtenerPorId);
router.post('/', categoriaCCostoController.crear);
router.put('/:id', categoriaCCostoController.actualizar);
router.delete('/:id', categoriaCCostoController.eliminar);

export default router;
