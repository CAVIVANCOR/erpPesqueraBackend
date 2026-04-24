import { Router } from 'express';
import * as motivoSinFaenaController from '../../controllers/Maestros/motivoSinFaena.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para MotivoSinFaena
 * Ruta del submódulo: 'motivoSinFaena'
 */

// Rutas especiales (DEBEN IR ANTES de /:id para evitar conflictos)
router.get(
  '/activos',
  autenticarJWT,
  checkPermission('motivoSinFaena', 'ver'),
  motivoSinFaenaController.listarMotivosActivos
);

// Rutas CRUD básicas
router.get(
  '/',
  autenticarJWT,
  checkPermission('motivoSinFaena', 'ver'),
  motivoSinFaenaController.listarMotivos
);

router.get(
  '/:id',
  autenticarJWT,
  checkPermission('motivoSinFaena', 'ver'),
  motivoSinFaenaController.obtenerMotivoPorId
);

router.post(
  '/',
  autenticarJWT,
  checkPermission('motivoSinFaena', 'crear'),
  motivoSinFaenaController.crearMotivo
);

router.put(
  '/:id',
  autenticarJWT,
  checkPermission('motivoSinFaena', 'editar'),
  motivoSinFaenaController.actualizarMotivo
);

router.delete(
  '/:id',
  autenticarJWT,
  checkPermission('motivoSinFaena', 'eliminar'),
  motivoSinFaenaController.eliminarMotivo
);

export default router;