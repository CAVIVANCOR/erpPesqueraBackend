import { Router } from 'express';
import * as cargosPersonalController from '../../controllers/Usuarios/cargosPersonal.controller.js';

const router = Router();

// Rutas CRUD para CargosPersonal
router.get('/', cargosPersonalController.listar);
router.get('/:id', cargosPersonalController.obtenerPorId);
router.post('/', cargosPersonalController.crear);
router.put('/:id', cargosPersonalController.actualizar);
router.delete('/:id', cargosPersonalController.eliminar);

export default router;
