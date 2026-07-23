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

export default router;