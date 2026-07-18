import { Router } from 'express';
import * as periodoContableController from '../../controllers/Contabilidad/periodoContable.controller.js';

const router = Router();

// Rutas CRUD básicas
router.get('/', periodoContableController.listar);

// ⚠️ IMPORTANTE: Rutas específicas ANTES de /:id para evitar conflictos
router.get('/por-fecha', periodoContableController.obtenerPeriodoPorFecha);
router.get('/empresa/:empresaId', periodoContableController.listarPorEmpresa);
router.get('/empresa/:empresaId/activo', periodoContableController.obtenerPeriodoActivo);

// Rutas con :id al final
router.get('/:id', periodoContableController.obtenerPorId);
router.post('/', periodoContableController.crear);
router.put('/:id', periodoContableController.actualizar);
router.delete('/:id', periodoContableController.eliminar);
// Rutas de gestión de períodos
router.post('/:id/cerrar', periodoContableController.cerrarPeriodo);
router.post('/:id/reabrir', periodoContableController.reabrirPeriodo);
router.post('/:id/bloquear', periodoContableController.bloquearPeriodo);

export default router;
