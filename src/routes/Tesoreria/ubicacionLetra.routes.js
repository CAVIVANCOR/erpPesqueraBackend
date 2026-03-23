import express from 'express';
import ubicacionLetraController from '../../controllers/Tesoreria/ubicacionLetra.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = express.Router();

/**
 * Rutas CRUD para UbicacionLetra
 * Catálogo de ubicaciones físicas de letras de cambio
 * Ruta del submódulo: 'ubicacionLetra'
 */

router.get(
  '/',
  autenticarJWT,
  checkPermission('ubicacionLetra', 'ver'),
  ubicacionLetraController.listar
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('ubicacionLetra', 'ver'),
  ubicacionLetraController.obtenerPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('ubicacionLetra', 'crear'),
  ubicacionLetraController.crear
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('ubicacionLetra', 'editar'),
  ubicacionLetraController.actualizar
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('ubicacionLetra', 'eliminar'),
  ubicacionLetraController.eliminar
);

// Rutas específicas
router.get(
  '/banco/:bancoId',
  autenticarJWT,
  checkPermission('ubicacionLetra', 'ver'),
  ubicacionLetraController.listarPorBanco
);

export default router;