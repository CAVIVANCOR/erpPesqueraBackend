import { Router } from 'express';
import * as personalController from '../../controllers/Usuarios/personal.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para Personal
 * Todas las rutas requieren autenticación Y permisos específicos
 * Ruta del submódulo: 'personal'
 */

// ✅ Rutas CRUD básicas (estas SÍ las mantuve correctamente)
router.get(
  '/',
  autenticarJWT,
  checkPermission('personal', 'ver'),
  personalController.listar
);

// ✅ ESTA RUTA ESPECIAL SÍ LA MANTUVE CORRECTAMENTE
router.get(
  '/personalxdescripcioncargo/:empresaId/:descripcionCargo',
  autenticarJWT,
  checkPermission('personal', 'ver'),
  personalController.listarPersonalxDescripCargo
);

// ⭐ NUEVO - Búsqueda de personal por DNI
// IMPORTANTE: Esta ruta debe ir ANTES de '/:id' para evitar conflictos
router.get(
  '/buscar-por-dni/:dni',
  autenticarJWT,
  checkPermission('personal', 'ver'),
  personalController.buscarPorDNI
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('personal', 'ver'),
  personalController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('personal', 'crear'),
  personalController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('personal', 'editar'),
  personalController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('personal', 'eliminar'),
  personalController.eliminar
);

export default router;