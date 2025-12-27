import { Router } from 'express';
import * as flujoCajaController from '../../controllers/Tesoreria/flujoCaja.controller.js';

const router = Router();

router.get('/', flujoCajaController.listar);
router.get('/:id', flujoCajaController.obtenerPorId);
router.post('/', flujoCajaController.crear);
router.put('/:id', flujoCajaController.actualizar);
router.delete('/:id', flujoCajaController.eliminar);

router.get('/empresa/:empresaId', flujoCajaController.listarPorEmpresa);
router.get('/empresa/:empresaId/periodo', flujoCajaController.listarPorPeriodo);
router.get('/empresa/:empresaId/resumen', flujoCajaController.obtenerResumenPorPeriodo);
router.get('/cuenta-corriente/:cuentaCorrienteId', flujoCajaController.listarPorCuentaCorriente);

export default router;
