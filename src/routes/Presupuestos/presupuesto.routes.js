import { Router } from 'express';
import * as presupuestoController from '../../controllers/Presupuestos/presupuesto.controller.js';

const router = Router();

router.get('/', presupuestoController.listar);
router.get('/:id', presupuestoController.obtenerPorId);
router.post('/', presupuestoController.crear);
router.put('/:id', presupuestoController.actualizar);
router.delete('/:id', presupuestoController.eliminar);

router.get('/empresa/:empresaId', presupuestoController.listarPorEmpresa);
router.get('/centro-costo/:centroCostoId', presupuestoController.listarPorCentroCosto);
router.post('/:id/aprobar', presupuestoController.aprobarPresupuesto);

export default router;
