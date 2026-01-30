import { Router } from 'express';
import * as estadoMultiFuncionController from '../../controllers/Maestros/estadoMultiFuncion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para EstadoMultiFuncion
 * Ruta del submódulo: 'estadoMultiFuncion'
 */

// Rutas especiales (DEBEN IR ANTES de /:id para evitar conflictos)
router.get(
  '/productos',
  autenticarJWT,
  checkPermission('estadoMultiFuncion', 'ver'),
  estadoMultiFuncionController.listarParaProductos
);

router.get(
  '/embarcaciones',
  autenticarJWT,
  checkPermission('estadoMultiFuncion', 'ver'),
  estadoMultiFuncionController.listarParaEmbarcaciones
);

router.get(
  '/temporada-pesca',
  autenticarJWT,
  checkPermission('estadoMultiFuncion', 'ver'),
  estadoMultiFuncionController.listarParaTemporadaPesca
);

router.get(
  '/faena-pesca',
  autenticarJWT,
  checkPermission('estadoMultiFuncion', 'ver'),
  estadoMultiFuncionController.listarParaFaenaPesca
);

router.get(
  '/faena-pesca-consumo',
  autenticarJWT,
  checkPermission('estadoMultiFuncion', 'ver'),
  estadoMultiFuncionController.listarParaFaenaPescaConsumo
);

router.get(
  '/por-tipo-proviene',
  autenticarJWT,
  checkPermission('estadoMultiFuncion', 'ver'),
  estadoMultiFuncionController.listarPorTipoProviene
);

// Rutas CRUD básicas
router.get(
  '/',
  autenticarJWT,
  checkPermission('estadoMultiFuncion', 'ver'),
  estadoMultiFuncionController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('estadoMultiFuncion', 'ver'),
  estadoMultiFuncionController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('estadoMultiFuncion', 'crear'),
  estadoMultiFuncionController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('estadoMultiFuncion', 'editar'),
  estadoMultiFuncionController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('estadoMultiFuncion', 'eliminar'),
  estadoMultiFuncionController.eliminar
);

export default router;