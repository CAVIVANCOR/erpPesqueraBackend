import { Router } from 'express';
import * as areaFisicaSedeController from '../../controllers/Maestros/areaFisicaSede.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import { checkPermission } from '../../middlewares/checkPermission.js';

const router = Router();

/**
 * Rutas CRUD para AreaFisicaSede
 * Ruta del submódulo: 'areasFisicasSede'
 */

router.get(
  '/', 
  autenticarJWT, 
  checkPermission('areasFisicasSede', 'ver'),
  areaFisicaSedeController.listar
);

router.get(
  '/:id', 
  autenticarJWT, 
  checkPermission('areasFisicasSede', 'ver'),
  areaFisicaSedeController.obtenerPorId
);

router.post(
  '/', 
  autenticarJWT, 
  checkPermission('areasFisicasSede', 'crear'),
  areaFisicaSedeController.crear
);

router.put(
  '/:id', 
  autenticarJWT, 
  checkPermission('areasFisicasSede', 'editar'),
  areaFisicaSedeController.actualizar
);

router.delete(
  '/:id', 
  autenticarJWT, 
  checkPermission('areasFisicasSede', 'eliminar'),
  areaFisicaSedeController.eliminar
);

export default router;