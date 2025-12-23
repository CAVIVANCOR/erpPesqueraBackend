import { Router } from 'express';
import * as notificacionController from '../../controllers/Notificacion/notificacion.controller.js';

const router = Router();

// Rutas específicas (DEBEN IR ANTES de las rutas con parámetros)
router.get('/no-leidas/count', notificacionController.contarNoLeidas);
router.put('/marcar-todas-leidas', notificacionController.marcarTodasComoLeidas);

// Rutas CRUD para Notificaciones
router.get('/', notificacionController.obtenerNotificaciones);
router.put('/:id/leida', notificacionController.marcarComoLeida);
router.delete('/:id', notificacionController.eliminar);

export default router;
