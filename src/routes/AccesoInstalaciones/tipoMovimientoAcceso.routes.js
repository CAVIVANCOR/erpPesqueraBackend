import { Router } from 'express';
import * as tipoMovimientoAccesoController from '../../controllers/AccesoInstalaciones/tipoMovimientoAcceso.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoMovimientoAcceso
 * Ruta del submódulo: 'tipoMovimientoAcceso'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoMovimientoAcceso', 'ver'),
  tipoMovimientoAccesoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovimientoAcceso', 'ver'),
  tipoMovimientoAccesoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoMovimientoAcceso', 'crear'),
  tipoMovimientoAccesoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovimientoAcceso', 'editar'),
  tipoMovimientoAccesoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovimientoAcceso', 'eliminar'),
  tipoMovimientoAccesoController.eliminar
);

export default router;