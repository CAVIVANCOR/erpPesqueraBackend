import { Router } from 'express';
import * as areaFisicaSedeController from '../../controllers/Maestros/areaFisicaSede.controller.js';

const router = Router();

// Rutas CRUD para AreaFisicaSede
router.get('/', areaFisicaSedeController.listar);
router.get('/:id', areaFisicaSedeController.obtenerPorId);
router.post('/', areaFisicaSedeController.crear);
router.put('/:id', areaFisicaSedeController.actualizar);
router.delete('/:id', areaFisicaSedeController.eliminar);

export default router;
