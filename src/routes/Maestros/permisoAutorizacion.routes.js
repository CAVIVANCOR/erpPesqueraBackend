import { Router } from 'express';
import * as permisoAutorizacionController from '../../controllers/Maestros/permisoAutorizacion.controller.js';

const router = Router();

// Rutas CRUD para PermisoAutorizacion
router.get('/', permisoAutorizacionController.listar);
router.get('/:id', permisoAutorizacionController.obtenerPorId);
router.post('/', permisoAutorizacionController.crear);
router.put('/:id', permisoAutorizacionController.actualizar);
router.delete('/:id', permisoAutorizacionController.eliminar);

export default router;
