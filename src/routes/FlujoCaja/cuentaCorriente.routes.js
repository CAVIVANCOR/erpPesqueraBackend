import { Router } from 'express';
import cuentaCorrienteController from '../../controllers/FlujoCaja/cuentaCorriente.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para CuentaCorriente
 * Ruta del submódulo: 'cuentaCorriente'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('cuentaCorriente', 'ver'),
  cuentaCorrienteController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('cuentaCorriente', 'ver'),
  cuentaCorrienteController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('cuentaCorriente', 'crear'),
  cuentaCorrienteController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('cuentaCorriente', 'editar'),
  cuentaCorrienteController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('cuentaCorriente', 'eliminar'),
  cuentaCorrienteController.eliminar
);

export default router;