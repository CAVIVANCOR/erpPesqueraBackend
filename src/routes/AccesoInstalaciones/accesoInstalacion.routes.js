import { Router } from 'express';
import * as accesoInstalacionController from '../../controllers/AccesoInstalaciones/accesoInstalacion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para AccesoInstalacion
 * Ruta del submódulo: 'accesoInstalacion'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('accesoInstalacion', 'ver'),
  accesoInstalacionController.listar
);

router.get(
  '/buscar-persona/:numeroDocumento', 
  autenticarJWT, 
  checkPermission('accesoInstalacion', 'ver'),
  accesoInstalacionController.buscarPersonaPorDocumento
);

router.get(
  '/buscar-vehiculo/:numeroPlaca', 
  autenticarJWT, 
  checkPermission('accesoInstalacion', 'ver'),
  accesoInstalacionController.buscarVehiculoPorPlaca
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('accesoInstalacion', 'ver'),
  accesoInstalacionController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('accesoInstalacion', 'crear'),
  accesoInstalacionController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('accesoInstalacion', 'editar'),
  accesoInstalacionController.actualizar
);

router.put(
  '/:id/salida-definitiva', 
  autenticarJWT, 
  checkPermission('accesoInstalacion', 'editar'),
  accesoInstalacionController.procesarSalidaDefinitiva
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('accesoInstalacion', 'eliminar'),
  accesoInstalacionController.eliminar
);

export default router;