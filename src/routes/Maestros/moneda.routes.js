import { Router } from 'express';
import * as monedaController from '../../controllers/Maestros/moneda.controller.js';

const router = Router();

// Rutas CRUD para Moneda
router.get('/', monedaController.listar);
router.get('/:id', monedaController.obtenerPorId);
router.post('/', monedaController.crear);
router.put('/:id', monedaController.actualizar);
router.delete('/:id', monedaController.eliminar);

export default router;
