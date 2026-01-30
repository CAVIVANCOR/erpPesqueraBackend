import { Router } from 'express';
import * as activoController from '../../controllers/Maestros/activo.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para Activo
 * Ruta del submódulo: 'activo'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('activo', 'ver'),
  activoController.listar
);

// ⚠️ RUTAS ESPECIALES RESTAURADAS - Deben ir ANTES de /:id
router.get(
  '/vehiculos-por-ruc/:ruc', 
  autenticarJWT, 
  checkPermission('activo', 'ver'),
  activoController.obtenerVehiculosPorRuc
);

router.get(
  '/por-empresa-tipo/:empresaId/:tipoId', 
  autenticarJWT, 
  checkPermission('activo', 'ver'),
  activoController.obtenerPorEmpresaYTipo
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('activo', 'ver'),
  activoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('activo', 'crear'),
  activoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('activo', 'editar'),
  activoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('activo', 'eliminar'),
  activoController.eliminar
);

export default router;