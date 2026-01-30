import { Router } from 'express';
import * as tipoCuentaCorrienteController from '../../controllers/FlujoCaja/tipoCuentaCorriente.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoCuentaCorriente
 * Ruta del submódulo: 'tipoCuentaCorriente'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoCuentaCorriente', 'ver'),
  tipoCuentaCorrienteController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoCuentaCorriente', 'ver'),
  tipoCuentaCorrienteController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoCuentaCorriente', 'crear'),
  tipoCuentaCorrienteController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoCuentaCorriente', 'editar'),
  tipoCuentaCorrienteController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoCuentaCorriente', 'eliminar'),
  tipoCuentaCorrienteController.eliminar
);

export default router;