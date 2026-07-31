import { Router } from 'express';
import * as tipoLibroContableSunatController from '../../controllers/Contabilidad/tipoLibroContableSunat.controller.js';

const router = Router();

router.get('/', tipoLibroContableSunatController.listar);
router.get('/:id', tipoLibroContableSunatController.obtenerPorId);
router.post('/', tipoLibroContableSunatController.crear);
router.put('/:id', tipoLibroContableSunatController.actualizar);
router.delete('/:id', tipoLibroContableSunatController.eliminar);

export default router;