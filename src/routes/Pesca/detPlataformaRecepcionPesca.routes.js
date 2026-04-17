import { Router } from 'express';
import * as detPlataformaRecepcionPescaController from '../../controllers/Pesca/detPlataformaRecepcionPesca.controller.js';

const router = Router();

// Rutas CRUD para DetPlataformaRecepcionPesca
router.get('/', detPlataformaRecepcionPescaController.listar);
router.get('/entidad/:entidadComercialId', detPlataformaRecepcionPescaController.obtenerPorEntidad);
router.get('/puerto/:puertoPescaId', detPlataformaRecepcionPescaController.obtenerPorPuerto);
router.get('/:id', detPlataformaRecepcionPescaController.obtenerPorId);
router.post('/', detPlataformaRecepcionPescaController.crear);
router.put('/:id', detPlataformaRecepcionPescaController.actualizar);
router.delete('/:id', detPlataformaRecepcionPescaController.eliminar);

export default router;