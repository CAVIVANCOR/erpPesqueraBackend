import { Router } from 'express';
import * as detRepuestosContratistaOTController from '../../controllers/Mantenimiento/detRepuestosContratistaOT.controller.js';

const router = Router();

// Rutas CRUD para DetRepuestosContratistaOT
router.get('/', detRepuestosContratistaOTController.listar);
router.get('/:id', detRepuestosContratistaOTController.obtenerPorId);
router.post('/', detRepuestosContratistaOTController.crear);
router.put('/:id', detRepuestosContratistaOTController.actualizar);
router.delete('/:id', detRepuestosContratistaOTController.eliminar);

export default router;