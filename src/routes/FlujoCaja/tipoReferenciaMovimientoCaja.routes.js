import { Router } from 'express';
import * as tipoReferenciaMovimientoCajaController from '../../controllers/FlujoCaja/tipoReferenciaMovimientoCaja.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoReferenciaMovimientoCaja
 * Ruta del submódulo: 'tipoReferenciaMovimientoCaja'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoReferenciaMovimientoCaja', 'ver'),
  tipoReferenciaMovimientoCajaController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoReferenciaMovimientoCaja', 'ver'),
  tipoReferenciaMovimientoCajaController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoReferenciaMovimientoCaja', 'crear'),
  tipoReferenciaMovimientoCajaController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoReferenciaMovimientoCaja', 'editar'),
  tipoReferenciaMovimientoCajaController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoReferenciaMovimientoCaja', 'eliminar'),
  tipoReferenciaMovimientoCajaController.eliminar
);

export default router;