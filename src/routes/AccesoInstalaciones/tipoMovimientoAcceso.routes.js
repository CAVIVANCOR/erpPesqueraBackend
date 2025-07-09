import { Router } from 'express';
import * as tipoMovimientoAccesoController from '../../controllers/AccesoInstalaciones/tipoMovimientoAcceso.controller.js';

const router = Router();

// Rutas CRUD para TipoMovimientoAcceso
router.get('/', tipoMovimientoAccesoController.listar);
router.get('/:id', tipoMovimientoAccesoController.obtenerPorId);
router.post('/', tipoMovimientoAccesoController.crear);
router.put('/:id', tipoMovimientoAccesoController.actualizar);
router.delete('/:id', tipoMovimientoAccesoController.eliminar);

export default router;
