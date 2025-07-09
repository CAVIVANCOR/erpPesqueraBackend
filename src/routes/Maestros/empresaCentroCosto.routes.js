import { Router } from 'express';
import * as empresaCentroCostoController from '../../controllers/Maestros/empresaCentroCosto.controller.js';

const router = Router();

// Rutas CRUD para EmpresaCentroCosto
router.get('/', empresaCentroCostoController.listar);
router.get('/:id', empresaCentroCostoController.obtenerPorId);
router.post('/', empresaCentroCostoController.crear);
router.put('/:id', empresaCentroCostoController.actualizar);
router.delete('/:id', empresaCentroCostoController.eliminar);

export default router;
