import { Router } from 'express';
import * as agrupacionEntidadController from '../../controllers/Maestros/agrupacionEntidad.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para AgrupacionEntidad
 * Ruta del submódulo: 'agrupacionEntidad'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('agrupacionEntidad', 'ver'),
  agrupacionEntidadController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('agrupacionEntidad', 'ver'),
  agrupacionEntidadController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('agrupacionEntidad', 'crear'),
  agrupacionEntidadController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('agrupacionEntidad', 'editar'),
  agrupacionEntidadController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('agrupacionEntidad', 'eliminar'),
  agrupacionEntidadController.eliminar
);

export default router;