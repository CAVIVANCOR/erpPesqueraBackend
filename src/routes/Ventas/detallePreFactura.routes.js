import { Router } from 'express';
import * as detallePreFacturaController from '../../controllers/Ventas/detallePreFactura.controller.js';

const router = Router();

// Rutas CRUD para DetallePreFactura
router.get('/', detallePreFacturaController.listar);
router.get('/:id', detallePreFacturaController.obtenerPorId);
router.post('/', detallePreFacturaController.crear);
router.put('/:id', detallePreFacturaController.actualizar);
router.delete('/:id', detallePreFacturaController.eliminar);

export default router;
