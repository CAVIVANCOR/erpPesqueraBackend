import express from 'express';
import letraCambioController from '../../controllers/Tesoreria/letraCambio.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas CRUD para LetraCambio
 * Gestiona las letras de cambio
 * Ruta del submódulo: 'letraCambio'
 */

router.get(
  '/',
  autenticarJWT,
  checkPermission('letraCambio', 'ver'),
  letraCambioController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('letraCambio', 'ver'),
  letraCambioController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('letraCambio', 'crear'),
  letraCambioController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('letraCambio', 'editar'),
  letraCambioController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('letraCambio', 'eliminar'),
  letraCambioController.eliminar
);

// Rutas específicas
router.get(
  '/empresa/:empresaId',
  autenticarJWT,
  checkPermission('letraCambio', 'ver'),
  letraCambioController.listarPorEmpresa
);

router.get(
  '/girado/:giradoId',
  autenticarJWT,
  checkPermission('letraCambio', 'ver'),
  letraCambioController.listarPorGirado
);

router.get(
  '/estado/:estadoLetraId',
  autenticarJWT,
  checkPermission('letraCambio', 'ver'),
  letraCambioController.listarPorEstado
);

router.get(
  '/vencimiento/rango',
  autenticarJWT,
  checkPermission('letraCambio', 'ver'),
  letraCambioController.listarPorRangoVencimiento
);

export default router;