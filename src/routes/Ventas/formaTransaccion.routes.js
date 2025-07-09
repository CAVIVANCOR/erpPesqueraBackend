import { Router } from 'express';
import * as formaTransaccionController from '../../controllers/Ventas/formaTransaccion.controller.js';

const router = Router();

// Rutas CRUD para FormaTransaccion
router.get('/', formaTransaccionController.listar);
router.get('/:id', formaTransaccionController.obtenerPorId);
router.post('/', formaTransaccionController.crear);
router.put('/:id', formaTransaccionController.actualizar);
router.delete('/:id', formaTransaccionController.eliminar);

export default router;
