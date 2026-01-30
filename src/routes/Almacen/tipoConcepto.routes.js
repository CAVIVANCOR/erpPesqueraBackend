import { Router } from 'express';
import * as tipoConceptoController from '../../controllers/Almacen/tipoConcepto.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoConcepto
 * Ruta del submódulo: 'tipoConcepto'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoConcepto', 'ver'),
  tipoConceptoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoConcepto', 'ver'),
  tipoConceptoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoConcepto', 'crear'),
  tipoConceptoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoConcepto', 'editar'),
  tipoConceptoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoConcepto', 'eliminar'),
  tipoConceptoController.eliminar
);

export default router;