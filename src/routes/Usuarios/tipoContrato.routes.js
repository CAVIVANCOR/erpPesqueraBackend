import { Router } from 'express';
import * as tipoContratoController from '../../controllers/Usuarios/tipoContrato.controller.js';

const router = Router();

// Rutas CRUD para TipoContrato
router.get('/', tipoContratoController.listar);
router.get('/:id', tipoContratoController.obtenerPorId);
router.post('/', tipoContratoController.crear);
router.put('/:id', tipoContratoController.actualizar);
router.delete('/:id', tipoContratoController.eliminar);

export default router;
