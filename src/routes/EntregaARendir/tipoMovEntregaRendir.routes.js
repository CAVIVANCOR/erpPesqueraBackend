import { Router } from 'express';
import * as tipoMovEntregaRendirController from '../../controllers/EntregaARendir/tipoMovEntregaRendir.controller.js';

const router = Router();

// Rutas CRUD para TipoMovEntregaRendir
router.get('/', tipoMovEntregaRendirController.listar);
router.get('/:id', tipoMovEntregaRendirController.obtenerPorId);
router.post('/', tipoMovEntregaRendirController.crear);
router.put('/:id', tipoMovEntregaRendirController.actualizar);
router.delete('/:id', tipoMovEntregaRendirController.eliminar);

export default router;
