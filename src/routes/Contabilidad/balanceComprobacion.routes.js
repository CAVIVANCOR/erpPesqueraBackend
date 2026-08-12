import { Router } from 'express';
import * as balanceComprobacionController from '../../controllers/Contabilidad/balanceComprobacion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

router.get(
  '/',
  autenticarJWT,
  checkPermission('balanceComprobacion', 'ver'),
  balanceComprobacionController.listarBalance
);

router.get(
  '/exportar-sunat-317',
  autenticarJWT,
  checkPermission('balanceComprobacion', 'ver'),
  balanceComprobacionController.exportarSUNAT317
);

router.get(
  '/exportar-sunat-316',
  autenticarJWT,
  checkPermission('balanceComprobacion', 'ver'),
  balanceComprobacionController.exportarSUNAT316
);

router.get(
  '/exportar-sunat-320',
  autenticarJWT,
  checkPermission('balanceComprobacion', 'ver'),
  balanceComprobacionController.exportarSUNAT320
);

export default router;