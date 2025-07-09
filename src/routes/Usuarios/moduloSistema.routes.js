import { Router } from 'express';
import * as moduloSistemaController from '../../controllers/Usuarios/moduloSistema.controller.js';

const router = Router();

// Rutas CRUD para ModuloSistema
router.get('/', moduloSistemaController.listar);
router.get('/:id', moduloSistemaController.obtenerPorId);
router.post('/', moduloSistemaController.crear);
router.put('/:id', moduloSistemaController.actualizar);
router.delete('/:id', moduloSistemaController.eliminar);

export default router;
