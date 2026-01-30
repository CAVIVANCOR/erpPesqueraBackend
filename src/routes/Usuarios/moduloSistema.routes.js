import { Router } from 'express';
import * as modulosSistemaController from '../../controllers/Usuarios/moduloSistema.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para ModulosSistema
 * Ruta del submódulo: 'modulosSistema'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('modulosSistema', 'ver'),
  modulosSistemaController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('modulosSistema', 'ver'),
  modulosSistemaController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('modulosSistema', 'crear'),
  modulosSistemaController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('modulosSistema', 'editar'),
  modulosSistemaController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('modulosSistema', 'eliminar'),
  modulosSistemaController.eliminar
);

export default router;