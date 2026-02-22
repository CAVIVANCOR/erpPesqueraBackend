import { Router } from 'express';
import * as detGastosPlanificadosController from '../../controllers/Pesca/detGastosPlanificados.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para DetGastosPlanificados
 * Todas las rutas requieren autenticación Y permisos específicos
 * Ruta del submódulo: 'gastos-planificados'
 */

router.get(
  '/',
  autenticarJWT,
  checkPermission('gastos-planificados', 'ver'),
  detGastosPlanificadosController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('gastos-planificados', 'ver'),
  detGastosPlanificadosController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('gastos-planificados', 'crear'),
  detGastosPlanificadosController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('gastos-planificados', 'editar'),
  detGastosPlanificadosController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('gastos-planificados', 'eliminar'),
  detGastosPlanificadosController.eliminar
);

export default router;
