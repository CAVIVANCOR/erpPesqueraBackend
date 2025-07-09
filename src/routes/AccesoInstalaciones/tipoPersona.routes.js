import { Router } from 'express';
import * as tipoPersonaController from '../../controllers/AccesoInstalaciones/tipoPersona.controller.js';

const router = Router();

// Rutas CRUD para TipoPersona
router.get('/', tipoPersonaController.listar);
router.get('/:id', tipoPersonaController.obtenerPorId);
router.post('/', tipoPersonaController.crear);
router.put('/:id', tipoPersonaController.actualizar);
router.delete('/:id', tipoPersonaController.eliminar);

export default router;
