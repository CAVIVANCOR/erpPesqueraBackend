import { Router } from 'express';
import * as videoconferenciaController from '../../controllers/Videoconferencia/videoconferencia.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/organizador/:organizadorId', videoconferenciaController.obtenerPorOrganizador);
router.get('/estado/:estado', videoconferenciaController.obtenerPorEstado);

// Rutas CRUD para Videoconferencia
router.get('/', videoconferenciaController.listar);
router.get('/:id', videoconferenciaController.obtenerPorId);
router.post('/', videoconferenciaController.crear);
router.put('/:id', videoconferenciaController.actualizar);
router.delete('/:id', videoconferenciaController.eliminar);

// Rutas para operaciones de estado
router.post('/:id/iniciar', videoconferenciaController.iniciar);
router.post('/:id/finalizar', videoconferenciaController.finalizar);
router.post('/:id/cancelar', videoconferenciaController.cancelar);

export default router;
