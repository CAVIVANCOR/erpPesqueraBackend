import { Router } from 'express';
import * as detTareasOTController from '../../controllers/Mantenimiento/detTareasOT.controller.js';

const router = Router();

// Rutas CRUD para DetTareasOT
router.get('/', detTareasOTController.listar);
router.get('/:id', detTareasOTController.obtenerPorId);
router.post('/', detTareasOTController.crear);
router.put('/:id', detTareasOTController.actualizar);
router.delete('/:id', detTareasOTController.eliminar);

export default router;
