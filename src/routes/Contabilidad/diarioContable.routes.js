import { Router } from 'express';
import * as diarioContableController from '../../controllers/Contabilidad/diarioContable.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas para Diario Contable
 * Ruta del submódulo: 'detalleAsientoContable'
 * 
 * REGLA DE PERMISOS:
 * - Ver líneas del diario: requiere 'ver'
 * - Exportar reportes: requiere 'ver' + accesoLibroFiscal o accesoLibroGerencial
 */

// Rutas de consulta
router.get(
  '/',
  autenticarJWT,
  checkPermission('detalleAsientoContable', 'ver'),
  diarioContableController.listarLineas
);

// Rutas de exportación
router.get(
  '/export/sunat-51',
  autenticarJWT,
  checkPermission('detalleAsientoContable', 'ver'),
  diarioContableController.exportarSUNAT51
);

router.get(
  '/export/excel',
  autenticarJWT,
  checkPermission('detalleAsientoContable', 'ver'),
  diarioContableController.exportarExcel
);

router.get(
  '/export/pdf',
  autenticarJWT,
  checkPermission('detalleAsientoContable', 'ver'),
  diarioContableController.exportarPDF
);

export default router;