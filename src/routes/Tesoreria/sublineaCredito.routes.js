import { Router } from 'express';
import * as sublineaCreditoController from '../../controllers/Tesoreria/sublineaCredito.controller.js';

const router = Router();

router.get('/', sublineaCreditoController.listar);
router.get('/activas', sublineaCreditoController.listarActivas);
router.get('/linea/:lineaCreditoId', sublineaCreditoController.listarPorLinea);
router.get('/:id', sublineaCreditoController.obtenerPorId);
router.post('/', sublineaCreditoController.crear);
router.post('/:id/actualizar-monto', sublineaCreditoController.actualizarMontoUtilizado);
router.put('/:id', sublineaCreditoController.actualizar);
router.delete('/:id', sublineaCreditoController.eliminar);

// ============================================
// RUTAS DE SOBREGIROS
// ============================================
router.post('/:sublineaId/sobregiros', sublineaCreditoController.crearSobregiro);
router.put('/sobregiros/:sobregiroid', sublineaCreditoController.actualizarSobregiro);
router.delete('/sobregiros/:sobregiroid', sublineaCreditoController.cancelarSobregiro);
router.get('/:sublineaId/sobregiros', sublineaCreditoController.obtenerSobregiros);
router.get('/:sublineaId/sobregiros/vigentes', sublineaCreditoController.obtenerSobregiosVigentes);

export default router;
