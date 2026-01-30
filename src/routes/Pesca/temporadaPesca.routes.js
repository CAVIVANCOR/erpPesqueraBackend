import { Router } from 'express';
import * as temporadaPescaController from '../../controllers/Pesca/temporadaPesca.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TemporadaPesca
 * Ruta del submódulo: 'temporadaPesca'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('temporadaPesca', 'ver'),
  temporadaPescaController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('temporadaPesca', 'ver'),
  temporadaPescaController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('temporadaPesca', 'crear'),
  temporadaPescaController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('temporadaPesca', 'editar'),
  temporadaPescaController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('temporadaPesca', 'eliminar'),
  temporadaPescaController.eliminar
);

router.post(
  '/:id/iniciar', 
  autenticarJWT, 
  checkPermission('temporadaPesca', 'editar'),
  temporadaPescaController.iniciar
);

router.post(
  '/:id/finalizar', 
  autenticarJWT, 
  checkPermission('temporadaPesca', 'editar'),
  temporadaPescaController.finalizar
);

router.post(
  '/:id/cancelar', 
  autenticarJWT, 
  checkPermission('temporadaPesca', 'eliminar'),
  temporadaPescaController.cancelar
);

router.post(
  '/:id/calcular-liquidaciones', 
  autenticarJWT, 
  checkPermission('temporadaPesca', 'editar'),
  temporadaPescaController.calcularLiquidaciones
);

export default router;