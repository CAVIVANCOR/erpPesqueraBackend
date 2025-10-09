import { Router } from 'express';
import * as temporadaPescaController from '../../controllers/Pesca/temporadaPesca.controller.js';

const router = Router();

// Rutas CRUD para TemporadaPesca
router.get('/', temporadaPescaController.listar);
router.get('/:id', temporadaPescaController.obtenerPorId);
router.post('/', temporadaPescaController.crear);
router.put('/:id', temporadaPescaController.actualizar);
router.delete('/:id', temporadaPescaController.eliminar);
router.post('/:id/iniciar', temporadaPescaController.iniciar);
router.post('/:id/finalizar', temporadaPescaController.finalizar);
router.post('/:id/cancelar', temporadaPescaController.cancelar);

export default router;
