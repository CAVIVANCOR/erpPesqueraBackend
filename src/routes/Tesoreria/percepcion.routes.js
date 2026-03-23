import express from 'express';
import percepcionController from '../../controllers/Tesoreria/percepcion.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas CRUD para Percepcion
 * Gestiona las percepciones fiscales
 * Ruta del submódulo: 'percepcion'
 */

router.get(
  '/',
  autenticarJWT,
  checkPermission('percepcion', 'ver'),
  percepcionController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('percepcion', 'ver'),
  percepcionController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('percepcion', 'crear'),
  percepcionController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('percepcion', 'editar'),
  percepcionController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('percepcion', 'eliminar'),
  percepcionController.eliminar
);

// Rutas específicas
router.get(
  '/empresa/:empresaId',
  autenticarJWT,
  checkPermission('percepcion', 'ver'),
  percepcionController.listarPorEmpresa
);

router.get(
  '/cliente/:clienteId',
  autenticarJWT,
  checkPermission('percepcion', 'ver'),
  percepcionController.listarPorCliente
);

router.get(
  '/periodo/:periodo',
  autenticarJWT,
  checkPermission('percepcion', 'ver'),
  percepcionController.listarPorPeriodo
);

export default router;