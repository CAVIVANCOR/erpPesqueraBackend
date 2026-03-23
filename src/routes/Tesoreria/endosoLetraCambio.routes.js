import express from 'express';
import endosoLetraCambioController from '../../controllers/Tesoreria/endosoLetraCambio.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas CRUD para EndosoLetraCambio
 * Gestiona los endosos de letras de cambio
 * Ruta del submódulo: 'endosoLetraCambio'
 */

router.get(
  '/',
  autenticarJWT,
  checkPermission('endosoLetraCambio', 'ver'),
  endosoLetraCambioController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('endosoLetraCambio', 'ver'),
  endosoLetraCambioController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('endosoLetraCambio', 'crear'),
  endosoLetraCambioController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('endosoLetraCambio', 'editar'),
  endosoLetraCambioController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('endosoLetraCambio', 'eliminar'),
  endosoLetraCambioController.eliminar
);

// Rutas específicas
router.get(
  '/letra/:letraCambioId',
  autenticarJWT,
  checkPermission('endosoLetraCambio', 'ver'),
  endosoLetraCambioController.listarPorLetra
);

export default router;