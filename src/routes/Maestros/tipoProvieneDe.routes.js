import { Router } from 'express';
import * as tipoProvieneDeController from '../../controllers/Maestros/tipoProvieneDe.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoProvieneDe
 * Ruta del submódulo: 'tipoProvieneDe'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoProvieneDe', 'ver'),
  tipoProvieneDeController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoProvieneDe', 'ver'),
  tipoProvieneDeController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoProvieneDe', 'crear'),
  tipoProvieneDeController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoProvieneDe', 'editar'),
  tipoProvieneDeController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoProvieneDe', 'eliminar'),
  tipoProvieneDeController.eliminar
);

export default router;