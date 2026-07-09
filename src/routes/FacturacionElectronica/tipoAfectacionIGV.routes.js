import { Router } from 'express';
import * as tipoAfectacionIGVController from '../../controllers/FacturacionElectronica/tipoAfectacionIGV.controller.js';

const router = Router();

router.get('/', tipoAfectacionIGVController.listar);
router.get('/activos', tipoAfectacionIGVController.listarActivos);
router.get('/categoria/:categoria', tipoAfectacionIGVController.listarPorCategoria);
router.get('/:id', tipoAfectacionIGVController.obtenerPorId);
router.post('/', tipoAfectacionIGVController.crear);
router.put('/:id', tipoAfectacionIGVController.actualizar);
router.delete('/:id', tipoAfectacionIGVController.eliminar);

export default router;