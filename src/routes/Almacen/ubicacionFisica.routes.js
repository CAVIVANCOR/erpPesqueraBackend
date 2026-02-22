import { Router } from 'express';
import * as ubicacionFisicaController from '../../controllers/Almacen/ubicacionFisica.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para UbicacionFisica
 * Todas las rutas requieren autenticación Y permisos específicos
 * Ruta del submódulo: 'ubicaciones-fisicas'
 */

router.get(
  '/',
  autenticarJWT,
  checkPermission('ubicaciones-fisicas', 'ver'),
  ubicacionFisicaController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('ubicaciones-fisicas', 'ver'),
  ubicacionFisicaController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('ubicaciones-fisicas', 'crear'),
  ubicacionFisicaController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('ubicaciones-fisicas', 'editar'),
  ubicacionFisicaController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('ubicaciones-fisicas', 'eliminar'),
  ubicacionFisicaController.eliminar
);

export default router;
