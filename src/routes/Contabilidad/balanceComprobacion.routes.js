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

export default router;