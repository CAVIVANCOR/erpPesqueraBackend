import { Router } from 'express';
import * as ubigeoController from '../../controllers/Usuarios/ubigeo.controller.js';

const router = Router();

// Rutas CRUD para Ubigeo
router.get('/', ubigeoController.listar);
router.get('/:id', ubigeoController.obtenerPorId);
router.post('/', ubigeoController.crear);
router.put('/:id', ubigeoController.actualizar);
router.delete('/:id', ubigeoController.eliminar);

export default router;
