import { Router } from 'express';
import * as periodoContableController from '../../controllers/Contabilidad/periodoContable.controller.js';

const router = Router();

// Rutas CRUD básicas
router.get('/', periodoContableController.listar);
router.get('/:id', periodoContableController.obtenerPorId);
router.post('/', periodoContableController.crear);
router.put('/:id', periodoContableController.actualizar);
router.delete('/:id', periodoContableController.eliminar);

// Rutas específicas por empresa
router.get('/empresa/:empresaId', periodoContableController.listarPorEmpresa);
router.get('/empresa/:empresaId/activo', periodoContableController.obtenerPeriodoActivo);

// Rutas de gestión de períodos
router.post('/:id/cerrar', periodoContableController.cerrarPeriodo);
router.post('/:id/reabrir', periodoContableController.reabrirPeriodo);
router.post('/:id/bloquear', periodoContableController.bloquearPeriodo);

export default router;
