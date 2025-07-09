import { Router } from 'express';
import * as tipoCuentaCorrienteController from '../../controllers/FlujoCaja/tipoCuentaCorriente.controller.js';

const router = Router();

// Rutas CRUD para TipoCuentaCorriente
router.get('/', tipoCuentaCorrienteController.listar);
router.get('/:id', tipoCuentaCorrienteController.obtenerPorId);
router.post('/', tipoCuentaCorrienteController.crear);
router.put('/:id', tipoCuentaCorrienteController.actualizar);
router.delete('/:id', tipoCuentaCorrienteController.eliminar);

export default router;
