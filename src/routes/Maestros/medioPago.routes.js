import { Router } from 'express';
import * as medioPagoController from '../../controllers/Maestros/medioPago.controller.js';

const router = Router();

// Rutas CRUD para MedioPago
router.get('/', medioPagoController.listar);
router.get('/:id', medioPagoController.obtenerPorId);
router.post('/', medioPagoController.crear);
router.put('/:id', medioPagoController.actualizar);
router.delete('/:id', medioPagoController.eliminar);

export default router;