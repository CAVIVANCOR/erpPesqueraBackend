import { Router } from 'express';
import * as tipoAfectacionIGVController from '../../controllers/FacturacionElectronica/tipoAfectacionIGV.controller.js';

const router = Router();

// Rutas CRUD básicas
router.get('/', tipoAfectacionIGVController.listar);
router.get('/activos', tipoAfectacionIGVController.listarActivos);
router.get('/:id', tipoAfectacionIGVController.obtenerPorId);
router.post('/', tipoAfectacionIGVController.crear);
router.put('/:id', tipoAfectacionIGVController.actualizar);
router.delete('/:id', tipoAfectacionIGVController.eliminar);

// Rutas específicas
router.get('/tipo-operacion/:tipoOperacion', tipoAfectacionIGVController.listarPorTipoOperacion);
router.get('/codigo-sunat/:codigoSunat', tipoAfectacionIGVController.obtenerPorCodigoSunat);

export default router;
