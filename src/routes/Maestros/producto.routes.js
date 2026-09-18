import { Router } from 'express';
import * as productoController from '../../controllers/Maestros/producto.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para Producto
 * Ruta del submódulo: 'producto'
 */

// ✅ Rutas CRUD básicas (estas SÍ las mantuve correctamente)
router.get(
  '/',
  autenticarJWT,
  checkPermission('producto', 'ver'),
  productoController.listar
);

// ✅ RUTA ESPECIAL: Obtener productos por entidad y empresa
router.get(
  '/entidad/:entidadComercialId/empresa/:empresaId',
  autenticarJWT,
  checkPermission('producto', 'ver'),
  productoController.obtenerPorEntidadYEmpresa
);

// ✅ RUTA ESPECIAL: Clonar productos a múltiples empresas
router.post(
  '/clonar-a-empresas',
  autenticarJWT,
  checkPermission('producto', 'crear'),
  productoController.clonarAEmpresas
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('producto', 'ver'),
  productoController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('producto', 'crear'),
  productoController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('producto', 'editar'),
  productoController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('producto', 'eliminar'),
  productoController.eliminar
);

export default router;