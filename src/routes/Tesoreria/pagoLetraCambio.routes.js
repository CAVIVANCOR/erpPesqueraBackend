import express from 'express';
import pagoLetraCambioController from '../../controllers/Tesoreria/pagoLetraCambio.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas CRUD para PagoLetraCambio
 * Gestiona los pagos realizados a letras de cambio
 * Ruta del submódulo: 'pagoLetraCambio'
 */

router.get(
  '/',
  autenticarJWT,
  checkPermission('pagoLetraCambio', 'ver'),
  pagoLetraCambioController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('pagoLetraCambio', 'ver'),
  pagoLetraCambioController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('pagoLetraCambio', 'crear'),
  pagoLetraCambioController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('pagoLetraCambio', 'editar'),
  pagoLetraCambioController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('pagoLetraCambio', 'eliminar'),
  pagoLetraCambioController.eliminar
);

// Rutas específicas
router.get(
  '/letra/:letraCambioId',
  autenticarJWT,
  checkPermission('pagoLetraCambio', 'ver'),
  pagoLetraCambioController.listarPorLetra
);

export default router;