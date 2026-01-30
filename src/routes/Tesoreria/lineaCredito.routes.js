import express from 'express';
import * as lineaCreditoController from '../../controllers/Tesoreria/lineaCredito.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas para LineaCredito
 * Todas las rutas requieren autenticación Y permisos específicos
 * Ruta del submódulo: 'lineas-credito'
 */

// Rutas específicas PRIMERO (antes de /:id)
router.get(
  '/vigentes', 
  autenticarJWT, 
  checkPermission('lineas-credito', 'ver'),
  lineaCreditoController.listarVigentes
);

router.get(
  '/empresa/:empresaId', 
  autenticarJWT, 
  checkPermission('lineas-credito', 'ver'),
  lineaCreditoController.listarPorEmpresa
);

router.get(
  '/reporte/lineas-disponibles/:empresaId', 
  autenticarJWT, 
  checkPermission('lineas-credito', 'ver'),
  lineaCreditoController.obtenerReporteLineasDisponibles
);

// CRUD básico con permisos granulares
router.get(
  '/', 
  autenticarJWT, 
  checkPermission('lineas-credito', 'ver'),
  lineaCreditoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('lineas-credito', 'ver'),
  lineaCreditoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('lineas-credito', 'crear'),
  lineaCreditoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('lineas-credito', 'editar'),
  lineaCreditoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('lineas-credito', 'eliminar'),
  lineaCreditoController.eliminar
);

// Préstamos vinculados
router.get(
  '/:id/prestamos', 
  autenticarJWT, 
  checkPermission('lineas-credito', 'ver'),
  lineaCreditoController.listarPrestamos
);

export default router;