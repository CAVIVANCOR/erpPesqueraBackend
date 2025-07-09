import { Router } from 'express';
import * as puertoPescaController from '../../controllers/Pesca/puertoPesca.controller.js';

const router = Router();

// Rutas CRUD para PuertoPesca
router.get('/', puertoPescaController.listar);
router.get('/:id', puertoPescaController.obtenerPorId);
router.post('/', puertoPescaController.crear);
router.put('/:id', puertoPescaController.actualizar);
router.delete('/:id', puertoPescaController.eliminar);

export default router;
