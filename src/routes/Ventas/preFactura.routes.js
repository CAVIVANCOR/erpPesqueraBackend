import { Router } from 'express';
import * as preFacturaController from '../../controllers/Ventas/preFactura.controller.js';

const router = Router();

// Rutas CRUD para PreFactura
router.get('/', preFacturaController.listar);
router.get('/:id', preFacturaController.obtenerPorId);
router.post('/', preFacturaController.crear);
router.put('/:id', preFacturaController.actualizar);
router.delete('/:id', preFacturaController.eliminar);

export default router;
