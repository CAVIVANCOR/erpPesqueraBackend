import { Router } from 'express';
import * as accesoInstalacionDetalleController from '../../controllers/AccesoInstalaciones/accesoInstalacionDetalle.controller.js';

const router = Router();

// Rutas CRUD para AccesoInstalacionDetalle
router.get('/', accesoInstalacionDetalleController.listar);
router.get('/:id', accesoInstalacionDetalleController.obtenerPorId);
router.post('/', accesoInstalacionDetalleController.crear);
router.put('/:id', accesoInstalacionDetalleController.actualizar);
router.delete('/:id', accesoInstalacionDetalleController.eliminar);

export default router;
