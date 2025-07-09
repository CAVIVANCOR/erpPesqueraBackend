import { Router } from 'express';
import * as tipoEquipoController from '../../controllers/AccesoInstalaciones/tipoEquipo.controller.js';

const router = Router();

// Rutas CRUD para TipoEquipo
router.get('/', tipoEquipoController.listar);
router.get('/:id', tipoEquipoController.obtenerPorId);
router.post('/', tipoEquipoController.crear);
router.put('/:id', tipoEquipoController.actualizar);
router.delete('/:id', tipoEquipoController.eliminar);

export default router;
