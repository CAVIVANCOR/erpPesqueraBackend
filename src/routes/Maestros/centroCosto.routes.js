import { Router } from 'express';
import * as centroCostoController from '../../controllers/Maestros/centroCosto.controller.js';

const router = Router();

// Rutas CRUD para CentroCosto
router.get('/', centroCostoController.listar);
router.get('/:id', centroCostoController.obtenerPorId);
router.post('/', centroCostoController.crear);
router.put('/:id', centroCostoController.actualizar);
router.delete('/:id', centroCostoController.eliminar);

export default router;
