import { Router } from 'express';
import * as tipoPersonaController from '../../controllers/AccesoInstalaciones/tipoPersona.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para TipoPersona
 * Ruta del submódulo: 'tipoPersona'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('tipoPersona', 'ver'),
  tipoPersonaController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoPersona', 'ver'),
  tipoPersonaController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('tipoPersona', 'crear'),
  tipoPersonaController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoPersona', 'editar'),
  tipoPersonaController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('tipoPersona', 'eliminar'),
  tipoPersonaController.eliminar
);

export default router;