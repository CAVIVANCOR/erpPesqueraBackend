import { Router } from 'express';
import * as detMovsEntregaRendirOTMantenimientoController from '../../controllers/Mantenimiento/detMovsEntregaRendirOTMantenimiento.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/entrega/:entregaId', detMovsEntregaRendirOTMantenimientoController.obtenerPorEntrega);

// Rutas CRUD para DetMovsEntregaRendirOTMantenimiento
router.get('/', detMovsEntregaRendirOTMantenimientoController.listar);
router.get('/:id', detMovsEntregaRendirOTMantenimientoController.obtenerPorId);
router.post('/', detMovsEntregaRendirOTMantenimientoController.crear);
router.put('/:id', detMovsEntregaRendirOTMantenimientoController.actualizar);
router.delete('/:id', detMovsEntregaRendirOTMantenimientoController.eliminar);

export default router;
