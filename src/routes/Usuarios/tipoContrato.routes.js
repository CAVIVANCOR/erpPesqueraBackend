import { Router } from 'express';
import * as tipoContratoController from '../../controllers/Usuarios/tipoContrato.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoContrato
 * Ruta del submódulo: 'tipoContrato'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoContrato', 'ver'),
  tipoContratoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoContrato', 'ver'),
  tipoContratoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoContrato', 'crear'),
  tipoContratoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoContrato', 'editar'),
  tipoContratoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoContrato', 'eliminar'),
  tipoContratoController.eliminar
);

export default router;