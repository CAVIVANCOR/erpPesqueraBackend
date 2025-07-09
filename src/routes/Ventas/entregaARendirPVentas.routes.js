import { Router } from 'express';
import * as entregaARendirPVentasController from '../../controllers/Ventas/entregaARendirPVentas.controller.js';

const router = Router();

// Rutas CRUD para EntregaARendirPVentas
router.get('/', entregaARendirPVentasController.listar);
router.get('/:id', entregaARendirPVentasController.obtenerPorId);
router.post('/', entregaARendirPVentasController.crear);
router.put('/:id', entregaARendirPVentasController.actualizar);
router.delete('/:id', entregaARendirPVentasController.eliminar);

export default router;
