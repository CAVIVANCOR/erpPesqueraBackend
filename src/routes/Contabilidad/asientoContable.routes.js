import { Router } from 'express';
import * as asientoContableController from '../../controllers/Contabilidad/asientoContable.controller.js';

const router = Router();

// Rutas CRUD básicas
router.get('/', asientoContableController.listar);
router.get('/:id', asientoContableController.obtenerPorId);
router.post('/', asientoContableController.crear);
router.put('/:id', asientoContableController.actualizar);
router.delete('/:id', asientoContableController.eliminar);

// Rutas específicas por empresa y período
router.get('/empresa/:empresaId', asientoContableController.listarPorEmpresa);
router.get('/periodo/:periodoContableId', asientoContableController.listarPorPeriodo);

// Rutas de gestión de asientos
router.post('/:id/aprobar', asientoContableController.aprobarAsiento);
router.post('/:id/anular', asientoContableController.anularAsiento);

export default router;
