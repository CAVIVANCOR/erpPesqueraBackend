import { Router } from 'express';
import * as entregaARendirOTMantenimientoController from '../../controllers/Mantenimiento/entregaARendirOTMantenimiento.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/ot/:otMantenimientoId', entregaARendirOTMantenimientoController.obtenerPorOT);

// Rutas CRUD para EntregaARendirOTMantenimiento
router.get('/', entregaARendirOTMantenimientoController.listar);
router.get('/:id', entregaARendirOTMantenimientoController.obtenerPorId);
router.post('/', entregaARendirOTMantenimientoController.crear);
router.put('/:id', entregaARendirOTMantenimientoController.actualizar);
router.delete('/:id', entregaARendirOTMantenimientoController.eliminar);

export default router;
