import { Router } from 'express';
import * as inversionFinancieraController from '../../controllers/Tesoreria/inversionFinanciera.controller.js';

const router = Router();

// Rutas CRUD básicas
router.get('/', inversionFinancieraController.listar);
router.get('/vigentes', inversionFinancieraController.listarVigentes);
router.get('/tipo/:tipo', inversionFinancieraController.listarPorTipo);
router.get('/empresa/:empresaId', inversionFinancieraController.listarPorEmpresa);
router.get('/empresa/:empresaId/resumen', inversionFinancieraController.obtenerResumenRendimientos);
router.get('/:id', inversionFinancieraController.obtenerPorId);
router.get('/:id/movimientos', inversionFinancieraController.listarMovimientos);
router.post('/', inversionFinancieraController.crear);
router.post('/:id/movimiento', inversionFinancieraController.registrarMovimiento);
router.post('/:id/liquidar', inversionFinancieraController.liquidar);
router.put('/:id', inversionFinancieraController.actualizar);
router.delete('/:id', inversionFinancieraController.eliminar);

export default router;
