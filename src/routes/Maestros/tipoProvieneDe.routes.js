import { Router } from 'express';
import * as tipoProvieneDeController from '../../controllers/Maestros/tipoProvieneDe.controller.js';

const router = Router();

// Rutas CRUD para TipoProvieneDe
router.get('/', tipoProvieneDeController.listar);
router.get('/:id', tipoProvieneDeController.obtenerPorId);
router.post('/', tipoProvieneDeController.crear);
router.put('/:id', tipoProvieneDeController.actualizar);
router.delete('/:id', tipoProvieneDeController.eliminar);

export default router;
