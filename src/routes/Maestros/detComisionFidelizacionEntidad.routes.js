import { Router } from 'express';
import * as detComisionFidelizacionEntidadController from '../../controllers/Maestros/detComisionFidelizacionEntidad.controller.js';

const router = Router();

// Rutas CRUD para DetComisionFidelizacionEntidad
router.get('/', detComisionFidelizacionEntidadController.listar);
router.get('/entidad/:entidadComercialFidelizacionId', detComisionFidelizacionEntidadController.obtenerPorEntidad);
router.get('/:id', detComisionFidelizacionEntidadController.obtenerPorId);
router.post('/', detComisionFidelizacionEntidadController.crear);
router.put('/:id', detComisionFidelizacionEntidadController.actualizar);
router.delete('/:id', detComisionFidelizacionEntidadController.eliminar);

export default router;