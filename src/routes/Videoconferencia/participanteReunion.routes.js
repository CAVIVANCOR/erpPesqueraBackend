import { Router } from 'express';
import * as participanteReunionController from '../../controllers/Videoconferencia/participanteReunion.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/videoconferencia/:videoconferenciaId', participanteReunionController.listarPorVideoconferencia);

// Rutas CRUD para ParticipanteReunion
router.get('/:id', participanteReunionController.obtenerPorId);
router.post('/', participanteReunionController.crear);
router.put('/:id', participanteReunionController.actualizar);
router.delete('/:id', participanteReunionController.eliminar);

// Rutas para operaciones de participante
router.post('/:id/confirmar', participanteReunionController.confirmar);
router.post('/:id/registrar-ingreso', participanteReunionController.registrarIngreso);
router.post('/:id/registrar-salida', participanteReunionController.registrarSalida);

export default router;
