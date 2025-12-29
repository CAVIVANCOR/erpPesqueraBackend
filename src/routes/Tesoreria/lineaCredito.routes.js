import { Router } from 'express';
import * as lineaCreditoController from '../../controllers/Tesoreria/lineaCredito.controller.js';

const router = Router();

// Rutas CRUD básicas
router.get('/', lineaCreditoController.listar);
router.get('/vigentes', lineaCreditoController.listarVigentes);
router.get('/empresa/:empresaId', lineaCreditoController.listarPorEmpresa);
router.get('/:id', lineaCreditoController.obtenerPorId);
router.get('/:id/utilizaciones', lineaCreditoController.listarUtilizaciones);
router.post('/', lineaCreditoController.crear);
router.post('/:id/utilizar', lineaCreditoController.registrarUtilizacion);
router.post('/utilizacion/:utilizacionId/devolver', lineaCreditoController.registrarDevolucion);
router.put('/:id', lineaCreditoController.actualizar);
router.delete('/:id', lineaCreditoController.eliminar);

export default router;
