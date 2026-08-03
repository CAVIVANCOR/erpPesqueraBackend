import { Router } from 'express';
import * as percepcionController from '../../controllers/Contabilidad/percepcion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas para Percepcion
 * Ruta del submódulo: 'percepcion'
 */

// Rutas CRUD básicas
router.get(
  '/', 
  autenticarJWT, 
  checkPermission('percepcion', 'ver'),
  percepcionController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('percepcion', 'ver'),
  percepcionController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('percepcion', 'crear'),
  percepcionController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('percepcion', 'editar'),
  percepcionController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('percepcion', 'eliminar'),
  percepcionController.eliminar
);

// Rutas específicas por empresa
router.get(
  '/empresa/:empresaId', 
  autenticarJWT, 
  checkPermission('percepcion', 'ver'),
  percepcionController.listarPorEmpresa
);

export default router;