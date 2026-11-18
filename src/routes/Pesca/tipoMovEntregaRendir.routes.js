import { Router } from 'express';
import * as tipoMovEntregaRendirController from '../../controllers/Pesca/tipoMovEntregaRendir.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoMovEntregaRendir
 * Ruta del submódulo: 'tipoMovEntregaRendir'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoMovEntregaRendir', 'ver'),
  tipoMovEntregaRendirController.listar
);

// Historial del tipo en todas las tablas (se consulta antes de eliminar)
router.get(
  '/:id/uso',
  autenticarJWT,
  checkPermission('tipoMovEntregaRendir', 'ver'),
  tipoMovEntregaRendirController.uso
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovEntregaRendir', 'ver'),
  tipoMovEntregaRendirController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoMovEntregaRendir', 'crear'),
  tipoMovEntregaRendirController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovEntregaRendir', 'editar'),
  tipoMovEntregaRendirController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoMovEntregaRendir', 'eliminar'),
  tipoMovEntregaRendirController.eliminar
);

export default router;