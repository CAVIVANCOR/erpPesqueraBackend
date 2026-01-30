import { Router } from 'express';
import * as bancoController from '../../controllers/FlujoCaja/banco.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para Banco
 * Ruta del submódulo: 'banco'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('banco', 'ver'),
  bancoController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('banco', 'ver'),
  bancoController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('banco', 'crear'),
  bancoController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('banco', 'editar'),
  bancoController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('banco', 'eliminar'),
  bancoController.eliminar
);

export default router;