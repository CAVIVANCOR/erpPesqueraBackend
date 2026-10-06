import { Router } from 'express';
import * as pagoCuotaPrestamoController from '../../controllers/Tesoreria/pagoCuotaPrestamo.controller.js';

const router = Router();

// Los pagos se crean solo desde el pago de cuotas de Caja y Bancos (operaciones-prestamo)
router.get('/', pagoCuotaPrestamoController.listar);
router.get('/:id', pagoCuotaPrestamoController.obtenerPorId);
router.put('/:id', pagoCuotaPrestamoController.actualizar);
router.delete('/:id', pagoCuotaPrestamoController.eliminar);

export default router;
