import { Router } from 'express';
import * as accionesPreviasFaenaController from '../../controllers/Pesca/accionesPreviasFaena.controller.js';

const router = Router();

// Rutas CRUD para AccionesPreviasFaena
router.get('/', accionesPreviasFaenaController.listar);
router.get('/:id', accionesPreviasFaenaController.obtenerPorId);
router.post('/', accionesPreviasFaenaController.crear);
router.put('/:id', accionesPreviasFaenaController.actualizar);
router.delete('/:id', accionesPreviasFaenaController.eliminar);

export default router;
