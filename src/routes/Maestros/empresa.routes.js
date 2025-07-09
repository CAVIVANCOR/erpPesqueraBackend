import { Router } from 'express';
import * as empresaController from '../../controllers/Maestros/empresa.controller.js';

const router = Router();

// Rutas CRUD para Empresa
router.get('/', empresaController.listar);
router.get('/:id', empresaController.obtenerPorId);
router.post('/', empresaController.crear);
router.put('/:id', empresaController.actualizar);
router.delete('/:id', empresaController.eliminar);

export default router;
