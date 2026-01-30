import { Router } from 'express';
import * as tipoDocumentoController from '../../controllers/Almacen/tipoDocumento.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoDocumento
 * Ruta del submódulo: 'tipoDocumento'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoDocumento', 'ver'),
  tipoDocumentoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoDocumento', 'ver'),
  tipoDocumentoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoDocumento', 'crear'),
  tipoDocumentoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoDocumento', 'editar'),
  tipoDocumentoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoDocumento', 'eliminar'),
  tipoDocumentoController.eliminar
);

export default router;