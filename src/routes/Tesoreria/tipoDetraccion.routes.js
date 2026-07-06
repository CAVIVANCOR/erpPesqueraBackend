import { Router } from 'express';
import * as tipoDetraccionController from '../../controllers/Tesoreria/tipoDetraccion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoDetraccion
 * Catálogo de tipos de detracción según SUNAT
 * Ruta del submódulo: 'tipos-detraccion'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipos-detraccion', 'ver'),
  tipoDetraccionController.listar
);

router.get(
  '/activos', 
  autenticarJWT, 
  checkPermission('tipos-detraccion', 'ver'),
  tipoDetraccionController.listarActivos
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipos-detraccion', 'ver'),
  tipoDetraccionController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipos-detraccion', 'crear'),
  tipoDetraccionController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipos-detraccion', 'editar'),
  tipoDetraccionController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipos-detraccion', 'eliminar'),
  tipoDetraccionController.eliminar
);

export default router;