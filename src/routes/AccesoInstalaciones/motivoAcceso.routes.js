import { Router } from 'express';
import * as motivoAccesoController from '../../controllers/AccesoInstalaciones/motivoAcceso.controller.js';

const router = Router();

// Rutas CRUD para MotivoAcceso
router.get('/', motivoAccesoController.listar);
router.get('/:id', motivoAccesoController.obtenerPorId);
router.post('/', motivoAccesoController.crear);
router.put('/:id', motivoAccesoController.actualizar);
router.delete('/:id', motivoAccesoController.eliminar);

export default router;
