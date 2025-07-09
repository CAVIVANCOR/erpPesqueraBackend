import { Router } from 'express';
import * as detalleCalaEspecieController from '../../controllers/Pesca/detalleCalaEspecie.controller.js';

const router = Router();

// Rutas CRUD para DetalleCalaEspecie
router.get('/', detalleCalaEspecieController.listar);
router.get('/:id', detalleCalaEspecieController.obtenerPorId);
router.post('/', detalleCalaEspecieController.crear);
router.put('/:id', detalleCalaEspecieController.actualizar);
router.delete('/:id', detalleCalaEspecieController.eliminar);

export default router;
