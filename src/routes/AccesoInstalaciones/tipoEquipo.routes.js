import { Router } from 'express';
import * as tipoEquipoController from '../../controllers/AccesoInstalaciones/tipoEquipo.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoEquipo
 * Ruta del submódulo: 'tipoEquipo'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoEquipo', 'ver'),
  tipoEquipoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoEquipo', 'ver'),
  tipoEquipoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoEquipo', 'crear'),
  tipoEquipoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoEquipo', 'editar'),
  tipoEquipoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoEquipo', 'eliminar'),
  tipoEquipoController.eliminar
);

export default router;