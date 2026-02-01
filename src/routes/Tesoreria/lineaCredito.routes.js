import express from 'express';
import * as lineaCreditoController from '../../controllers/Tesoreria/lineaCredito.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas para LineaCredito
 * Todas las rutas requieren autenticación Y permisos específicos
 * Ruta del submódulo: 'lineaCredito'
 */

// Rutas específicas PRIMERO (antes de /:id)
router.get(
  '/vigentes', 
  autenticarJWT, 
  checkPermission('lineaCredito', 'ver'),
  lineaCreditoController.listarVigentes
);

router.get(
  '/empresa/:empresaId', 
  autenticarJWT, 
  checkPermission('lineaCredito', 'ver'),
  lineaCreditoController.listarPorEmpresa
);

router.get(
  '/reporte/lineas-disponibles/:empresaId', 
  autenticarJWT, 
  checkPermission('lineaCredito', 'ver'),
  lineaCreditoController.obtenerReporteLineasDisponibles
);

router.get(
  '/tipo-cambio/:fecha', 
  autenticarJWT, 
  checkPermission('lineaCredito', 'ver'),
  lineaCreditoController.obtenerTipoCambio
);


// CRUD básico con permisos granulares
router.get(
  '/', 
  autenticarJWT, 
  checkPermission('lineaCredito', 'ver'),
  lineaCreditoController.listar
);


router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('lineaCredito', 'ver'),
  lineaCreditoController.obtenerPorId
);


router.post(
  '/', 
  autenticarJWT, 
  checkPermission('lineaCredito', 'crear'),
  lineaCreditoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('lineaCredito', 'editar'),
  lineaCreditoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('lineaCredito', 'eliminar'),
  lineaCreditoController.eliminar
);

// Préstamos vinculados
router.get(
  '/:id/prestamos', 
  autenticarJWT, 
  checkPermission('lineaCredito', 'ver'),
  lineaCreditoController.listarPrestamos
);

export default router;