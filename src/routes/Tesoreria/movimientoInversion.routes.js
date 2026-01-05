import { Router } from 'express';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import * as movimientoInversionController from '../../controllers/Tesoreria/movimientoInversion.controller.js';

const router = Router();

// Rutas específicas PRIMERO (antes de /:id)
router.get('/inversion/:inversionFinancieraId', autenticarJWT, movimientoInversionController.listarPorInversion);
router.get('/inversion/:inversionFinancieraId/resumen', autenticarJWT, movimientoInversionController.obtenerResumenPorInversion);
router.get('/tipo/:tipoMovimiento', autenticarJWT, movimientoInversionController.listarPorTipo);

// CRUD básico
router.get('/', autenticarJWT, movimientoInversionController.listar);
router.get('/:id', autenticarJWT, movimientoInversionController.obtenerPorId);
router.post('/', autenticarJWT, movimientoInversionController.crear);
router.put('/:id', autenticarJWT, movimientoInversionController.actualizar);
router.delete('/:id', autenticarJWT, movimientoInversionController.eliminar);

export default router;
