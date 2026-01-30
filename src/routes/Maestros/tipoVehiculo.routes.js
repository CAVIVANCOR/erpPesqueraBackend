import { Router } from 'express';
import * as tipoVehiculoController from '../../controllers/Maestros/tipoVehiculo.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoVehiculo
 * Ruta del submódulo: 'tipoVehiculo'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoVehiculo', 'ver'),
  tipoVehiculoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoVehiculo', 'ver'),
  tipoVehiculoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoVehiculo', 'crear'),
  tipoVehiculoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoVehiculo', 'editar'),
  tipoVehiculoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoVehiculo', 'eliminar'),
  tipoVehiculoController.eliminar
);

export default router;