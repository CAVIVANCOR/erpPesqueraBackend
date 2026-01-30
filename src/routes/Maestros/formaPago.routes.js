import { Router } from 'express';
import * as formaPagoController from '../../controllers/Maestros/formaPago.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para FormaPago
 * Ruta del submódulo: 'formaPago'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('formaPago', 'ver'),
  formaPagoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('formaPago', 'ver'),
  formaPagoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('formaPago', 'crear'),
  formaPagoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('formaPago', 'editar'),
  formaPagoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('formaPago', 'eliminar'),
  formaPagoController.eliminar
);

export default router;