import { Router } from 'express';
import * as cuentaPorPagarController from '../../controllers/CuentasPorCobrarPagar/cuentaPorPagar.controller.js';

const router = Router();

router.get('/', cuentaPorPagarController.listar);
router.get('/:id', cuentaPorPagarController.obtenerPorId);
router.post('/', cuentaPorPagarController.crear);
router.put('/:id', cuentaPorPagarController.actualizar);
router.delete('/:id', cuentaPorPagarController.eliminar);

router.get('/empresa/:empresaId', cuentaPorPagarController.listarPorEmpresa);
router.get('/empresa/:empresaId/pendientes', cuentaPorPagarController.listarPendientes);
router.get('/empresa/:empresaId/vencidas', cuentaPorPagarController.listarVencidas);
router.get('/proveedor/:proveedorId', cuentaPorPagarController.listarPorProveedor);
router.get('/ordencompra/:ordenCompraId', cuentaPorPagarController.obtenerPorOrdenCompraId);

export default router;
