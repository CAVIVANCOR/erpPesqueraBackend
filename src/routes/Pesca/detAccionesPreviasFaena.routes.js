import { Router } from 'express';
import * as detAccionesPreviasFaenaController from '../../controllers/Pesca/detAccionesPreviasFaena.controller.js';

const router = Router();

// Rutas CRUD para DetAccionesPreviasFaena
router.get('/', detAccionesPreviasFaenaController.listar);
router.get('/:id', detAccionesPreviasFaenaController.obtenerPorId);
router.post('/', detAccionesPreviasFaenaController.crear);
router.put('/:id', detAccionesPreviasFaenaController.actualizar);
router.delete('/:id', detAccionesPreviasFaenaController.eliminar);
router.get('/temporada/:temporadaId', detAccionesPreviasFaenaController.obtenerPorTemporada);

export default router;
