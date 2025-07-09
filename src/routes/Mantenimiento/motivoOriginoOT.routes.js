import { Router } from 'express';
import * as motivoOriginoOTController from '../../controllers/Mantenimiento/motivoOriginoOT.controller.js';

const router = Router();

// Rutas CRUD para MotivoOriginoOT
router.get('/', motivoOriginoOTController.listar);
router.get('/:id', motivoOriginoOTController.obtenerPorId);
router.post('/', motivoOriginoOTController.crear);
router.put('/:id', motivoOriginoOTController.actualizar);
router.delete('/:id', motivoOriginoOTController.eliminar);

export default router;
