import { Router } from 'express';
import * as detMovsEntregaRendirPVentasController from '../../controllers/Ventas/detMovsEntregaRendirPVentas.controller.js';

const router = Router();

// Rutas CRUD para DetMovsEntregaRendirPVentas
router.get('/', detMovsEntregaRendirPVentasController.listar);
router.get('/:id', detMovsEntregaRendirPVentasController.obtenerPorId);
router.post('/', detMovsEntregaRendirPVentasController.crear);
router.put('/:id', detMovsEntregaRendirPVentasController.actualizar);
router.delete('/:id', detMovsEntregaRendirPVentasController.eliminar);

export default router;
