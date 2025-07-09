import { Router } from 'express';
import * as unidadMedidaController from '../../controllers/Maestros/unidadMedida.controller.js';

const router = Router();

// Rutas CRUD para UnidadMedida
router.get('/', unidadMedidaController.listar);
router.get('/:id', unidadMedidaController.obtenerPorId);
router.post('/', unidadMedidaController.crear);
router.put('/:id', unidadMedidaController.actualizar);
router.delete('/:id', unidadMedidaController.eliminar);

export default router;
