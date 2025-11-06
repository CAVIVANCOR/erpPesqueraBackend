import { Router } from 'express';
import * as ctaCteEntidadController from '../../controllers/Maestros/ctaCteEntidad.controller.js';

const router = Router();

// Rutas CRUD para CtaCteEntidad
router.get('/', ctaCteEntidadController.listar);
router.get('/entidad/:entidadComercialId', ctaCteEntidadController.obtenerPorEntidad);
router.get('/:id', ctaCteEntidadController.obtenerPorId);
router.post('/', ctaCteEntidadController.crear);
router.put('/:id', ctaCteEntidadController.actualizar);
router.delete('/:id', ctaCteEntidadController.eliminar);

export default router;