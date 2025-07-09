import { Router } from 'express';
import * as tipoAccesoInstalacionController from '../../controllers/AccesoInstalaciones/tipoAccesoInstalacion.controller.js';

const router = Router();

// Rutas CRUD para TipoAccesoInstalacion
router.get('/', tipoAccesoInstalacionController.listar);
router.get('/:id', tipoAccesoInstalacionController.obtenerPorId);
router.post('/', tipoAccesoInstalacionController.crear);
router.put('/:id', tipoAccesoInstalacionController.actualizar);
router.delete('/:id', tipoAccesoInstalacionController.eliminar);

export default router;
