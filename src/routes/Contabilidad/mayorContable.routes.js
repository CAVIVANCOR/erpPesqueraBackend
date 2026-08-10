import { Router } from 'express';
import * as mayorContableController from '../../controllers/Contabilidad/mayorContable.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas para Libro Mayor Contable
 * Ruta del submódulo: 'detalleAsientoContableMayor'
 * 
 * REGLA DE PERMISOS:
 * - Ver líneas del mayor: requiere 'ver'
 */

// Rutas de consulta
router.get(
  '/',
  autenticarJWT,
  checkPermission('detalleAsientoContableMayor', 'ver'),
  mayorContableController.listarLineas
);

// Rutas de exportación
router.get(
  '/export/sunat-61',
  autenticarJWT,
  checkPermission('detalleAsientoContableMayor', 'ver'),
  mayorContableController.exportarSUNAT61
);

router.get(
  '/export/excel',
  autenticarJWT,
  checkPermission('detalleAsientoContableMayor', 'ver'),
  mayorContableController.exportarExcel
);

router.get(
  '/export/pdf',
  autenticarJWT,
  checkPermission('detalleAsientoContableMayor', 'ver'),
  mayorContableController.exportarPDF
);

export default router;