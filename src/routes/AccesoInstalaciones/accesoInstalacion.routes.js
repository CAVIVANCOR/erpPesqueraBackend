import { Router } from 'express';
import * as accesoInstalacionController from '../../controllers/AccesoInstalaciones/accesoInstalacion.controller.js';

const router = Router();

// Rutas CRUD para AccesoInstalacion
router.get('/', accesoInstalacionController.listar);
router.get('/:id', accesoInstalacionController.obtenerPorId);
router.post('/', accesoInstalacionController.crear);
router.put('/:id', accesoInstalacionController.actualizar);
router.delete('/:id', accesoInstalacionController.eliminar);

export default router;
