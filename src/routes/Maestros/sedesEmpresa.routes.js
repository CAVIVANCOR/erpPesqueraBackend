import { Router } from 'express';
import * as sedesEmpresaController from '../../controllers/Maestros/sedesEmpresa.controller.js';

const router = Router();

// Rutas CRUD para SedesEmpresa
router.get('/', sedesEmpresaController.listar);
router.get('/:id', sedesEmpresaController.obtenerPorId);
router.post('/', sedesEmpresaController.crear);
router.put('/:id', sedesEmpresaController.actualizar);
router.delete('/:id', sedesEmpresaController.eliminar);

export default router;
