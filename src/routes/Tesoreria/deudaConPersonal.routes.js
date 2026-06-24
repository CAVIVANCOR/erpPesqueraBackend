import { Router } from 'express';
import * as deudaConPersonalController from '../../controllers/Tesoreria/deudaConPersonal.controller.js';

const router = Router();

router.get('/', deudaConPersonalController.listar);
router.get('/:id', deudaConPersonalController.obtenerPorId);
router.post('/', deudaConPersonalController.crear);
router.put('/:id', deudaConPersonalController.actualizar);
router.delete('/:id', deudaConPersonalController.eliminar);

router.get('/empresa/:empresaId', deudaConPersonalController.listarPorEmpresa);
router.get('/empresa/:empresaId/pendientes', deudaConPersonalController.listarPendientes);
router.get('/empresa/:empresaId/vencidas', deudaConPersonalController.listarVencidas);
router.get('/personal/:personalId', deudaConPersonalController.listarPorPersonal);
router.get('/tipo/:tipoDeudaId', deudaConPersonalController.listarPorTipo);


// ========================================
// RUTAS DE ASIENTOS CONTABLES
// ========================================
router.get('/:id/borrador-asiento', deudaConPersonalController.generarBorradorAsiento);
router.post('/:id/guardar-asiento', deudaConPersonalController.guardarAsiento);
router.delete('/:id/asiento/:asientoId', deudaConPersonalController.eliminarAsiento);

export default router;