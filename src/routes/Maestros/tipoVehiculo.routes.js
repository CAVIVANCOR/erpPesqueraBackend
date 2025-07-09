import { Router } from 'express';
import * as tipoVehiculoController from '../../controllers/Maestros/tipoVehiculo.controller.js';

const router = Router();

// Rutas CRUD para TipoVehiculo
router.get('/', tipoVehiculoController.listar);
router.get('/:id', tipoVehiculoController.obtenerPorId);
router.post('/', tipoVehiculoController.crear);
router.put('/:id', tipoVehiculoController.actualizar);
router.delete('/:id', tipoVehiculoController.eliminar);

export default router;
