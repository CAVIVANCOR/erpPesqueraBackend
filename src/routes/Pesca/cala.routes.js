import { Router } from 'express';
import * as calaController from '../../controllers/Pesca/cala.controller.js';

const router = Router();

// Rutas CRUD para Cala
router.get('/', calaController.listar);
router.get('/faena/:faenaPescaId', calaController.obtenerPorFaena);
router.get('/:id', calaController.obtenerPorId);
router.post('/', calaController.crear);
router.put('/:id', calaController.actualizar);
router.delete('/:id', calaController.eliminar);

export default router;
