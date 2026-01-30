import { Router } from 'express';
import * as entidadComercialController from '../../controllers/Maestros/entidadComercial.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para EntidadComercial
 * Ruta del submódulo: 'entidadComercial'
 */

// ✅ Rutas CRUD básicas (estas SÍ las mantuve correctamente)
router.get(
  '/',
  autenticarJWT,
  checkPermission('entidadComercial', 'ver'),
  entidadComercialController.listar
);

// ✅ ESTAS RUTAS ESPECIALES SÍ LAS MANTUVE CORRECTAMENTE
router.get(
  '/agencias-envio',
  autenticarJWT,
  checkPermission('entidadComercial', 'ver'),
  entidadComercialController.obtenerAgenciasEnvio
);

router.get(
  '/proveedores-gps',
  autenticarJWT,
  checkPermission('entidadComercial', 'ver'),
  entidadComercialController.obtenerProveedoresGps
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('entidadComercial', 'ver'),
  entidadComercialController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('entidadComercial', 'crear'),
  entidadComercialController.crear
);

router.post(
  '/:id/clonar-a-empresas',
  autenticarJWT,
  checkPermission('entidadComercial', 'crear'),
  entidadComercialController.clonarAEmpresas
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('entidadComercial', 'editar'),
  entidadComercialController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('entidadComercial', 'eliminar'),
  entidadComercialController.eliminar
);

export default router;