import { Router } from 'express';
import * as submoduloSistemaController from '../../controllers/Usuarios/submoduloSistema.controller.js';

const router = Router();

// Rutas CRUD para SubmoduloSistema
router.get('/', submoduloSistemaController.listar);
router.get('/:id', submoduloSistemaController.obtenerPorId);
router.post('/', submoduloSistemaController.crear);
router.put('/:id', submoduloSistemaController.actualizar);
router.delete('/:id', submoduloSistemaController.eliminar);

export default router;
