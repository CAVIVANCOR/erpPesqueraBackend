import { Router } from 'express';
import * as grabacionReunionController from '../../controllers/Videoconferencia/grabacionReunion.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/videoconferencia/:videoconferenciaId', grabacionReunionController.listarPorVideoconferencia);

// Rutas CRUD para GrabacionReunion
router.get('/:id', grabacionReunionController.obtenerPorId);
router.post('/', grabacionReunionController.crear);
router.put('/:id', grabacionReunionController.actualizar);
router.delete('/:id', grabacionReunionController.eliminar);

export default router;
