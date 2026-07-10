import { Router } from 'express';
import * as tipoOperacionSunatController from '../../controllers/FacturacionElectronica/tipoOperacionSunat.controller.js';

const router = Router();

router.get('/', tipoOperacionSunatController.listar);
router.get('/:id', tipoOperacionSunatController.obtenerPorId);
router.post('/', tipoOperacionSunatController.crear);
router.put('/:id', tipoOperacionSunatController.actualizar);
router.delete('/:id', tipoOperacionSunatController.eliminar);

export default router;