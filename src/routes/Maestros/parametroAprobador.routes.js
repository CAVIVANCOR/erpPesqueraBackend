import { Router } from 'express';
import * as parametroAprobadorController from '../../controllers/Maestros/parametroAprobador.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para ParametroAprobador
 * Ruta del submódulo: 'parametroAprobador'
 */

// ✅ Rutas CRUD básicas (estas SÍ las mantuve correctamente)
router.get(
  '/',
  autenticarJWT,
  checkPermission('parametroAprobador', 'ver'),
  parametroAprobadorController.listar
);

// ⚠️ RUTA QUE YO BORRÉ Y AHORA RESTAURO - ESTA ES LA QUE CAUSA EL ERROR 500
router.get(
  '/por-modulo',
  autenticarJWT,
  checkPermission('parametroAprobador', 'ver'),
  parametroAprobadorController.listarPorModulo
);

// Aprobador vigente (lo consumen otras pantallas, p. ej. la firma del PDF de liquidación): solo
// requiere sesión, no el permiso del mantenimiento de parámetros. Va antes de '/:id'.
router.get(
  '/vigente',
  autenticarJWT,
  parametroAprobadorController.obtenerVigente
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('parametroAprobador', 'ver'),
  parametroAprobadorController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('parametroAprobador', 'crear'),
  parametroAprobadorController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('parametroAprobador', 'editar'),
  parametroAprobadorController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('parametroAprobador', 'eliminar'),
  parametroAprobadorController.eliminar
);

export default router;