import { Router } from 'express';
import * as empresaController from '../../controllers/Maestros/empresa.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para Empresa
 * Ruta del submódulo: 'empresas'
 */

// ✅ Rutas CRUD básicas (estas SÍ las mantuve correctamente)
router.get(
  '/',
  autenticarJWT,
  checkPermission('empresas', 'ver'),
  empresaController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('empresas', 'ver'),
  empresaController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('empresas', 'crear'),
  empresaController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('empresas', 'editar'),
  empresaController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('empresas', 'eliminar'),
  empresaController.eliminar
);

// ✅ ESTAS RUTAS ESPECIALES SÍ LAS MANTUVE CORRECTAMENTE
router.post(
  '/:id/propagar-margenes',
  autenticarJWT,
  checkPermission('empresas', 'editar'),
  empresaController.propagarMargenes
);

router.get(
  '/:id/parametros-liquidacion',
  autenticarJWT,
  checkPermission('empresas', 'ver'),
  empresaController.obtenerParametrosLiquidacion
);

export default router;