import { Router } from 'express';
import * as formaPagoController from '../../controllers/Maestros/formaPago.controller.js';

const router = Router();

// Rutas CRUD para FormaPago
router.get('/', formaPagoController.listar);
router.get('/:id', formaPagoController.obtenerPorId);
router.post('/', formaPagoController.crear);
router.put('/:id', formaPagoController.actualizar);
router.delete('/:id', formaPagoController.eliminar);

export default router;
