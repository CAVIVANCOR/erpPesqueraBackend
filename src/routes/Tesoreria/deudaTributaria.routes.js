import { Router } from 'express';
import * as deudaTributariaController from '../../controllers/Tesoreria/deudaTributaria.controller.js';

const router = Router();

router.get('/', deudaTributariaController.listar);
router.get('/:id', deudaTributariaController.obtenerPorId);
router.post('/', deudaTributariaController.crear);
router.put('/:id', deudaTributariaController.actualizar);
router.delete('/:id', deudaTributariaController.eliminar);

router.get('/empresa/:empresaId', deudaTributariaController.listarPorEmpresa);
router.get('/empresa/:empresaId/pendientes', deudaTributariaController.listarPendientes);
router.get('/empresa/:empresaId/vencidas', deudaTributariaController.listarVencidas);
router.get('/empresa/:empresaId/periodo/:periodo', deudaTributariaController.listarPorPeriodo);
router.get('/tipo/:tipoDeudaId', deudaTributariaController.listarPorTipo);

// Rutas para asientos contables
router.get('/:id/borrador-asiento', deudaTributariaController.generarBorradorAsiento);
router.post('/:id/generar-asiento', deudaTributariaController.generarAsientoContable);

export default router;