import { Router } from 'express';
import * as detGastosPlanificadosController from '../../controllers/Pesca/detGastosPlanificados.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

const router = Router();

/**
 * Rutas CRUD para DetGastosPlanificados
 * Son detalles informativos de asignaciones, no requieren permisos específicos
 * Solo requieren autenticación JWT
 */

router.get(
  '/',
  autenticarJWT,
  detGastosPlanificadosController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  detGastosPlanificadosController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  detGastosPlanificadosController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  detGastosPlanificadosController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  detGastosPlanificadosController.eliminar
);

export default router;