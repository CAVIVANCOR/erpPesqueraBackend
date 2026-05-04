import { Router } from 'express';
import * as documentosOrigenController from '../../controllers/Contabilidad/documentosOrigen.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas para Documentos Origen (Polimórfico)
 * Endpoint genérico para cargar documentos según submódulo
 */

router.get(
  '/:nombreModelo',
  autenticarJWT,
  checkPermission('asientoContable', 'ver'),
  documentosOrigenController.obtenerPorModelo
);

export default router;