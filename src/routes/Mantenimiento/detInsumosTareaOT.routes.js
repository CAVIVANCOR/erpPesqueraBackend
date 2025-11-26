import { Router } from 'express';
import * as detInsumosTareaOTController from '../../controllers/Mantenimiento/detInsumosTareaOT.controller.js';

const router = Router();

// Rutas CRUD para DetInsumosTareaOT
router.get('/', detInsumosTareaOTController.listar);
router.get('/tarea/:tareaId', detInsumosTareaOTController.listarPorTarea); // Listar insumos de una tarea específica
router.get('/:id', detInsumosTareaOTController.obtenerPorId);
router.post('/', detInsumosTareaOTController.crear);
router.put('/:id', detInsumosTareaOTController.actualizar);
router.delete('/:id', detInsumosTareaOTController.eliminar);

export default router;
