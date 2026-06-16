import express from 'express';
import * as motivoNotaCreditoDebitoController from '../../controllers/Ventas/motivoNotaCreditoDebito.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Rutas para MotivoNotaCreditoDebito
 * Todas las rutas requieren autenticación
 */

// Rutas específicas PRIMERO (antes de /:id)
router.get('/activos', autenticarJWT, motivoNotaCreditoDebitoController.listarActivos);
router.get('/notas-credito', autenticarJWT, motivoNotaCreditoDebitoController.listarNotasCredito);
router.get('/notas-debito', autenticarJWT, motivoNotaCreditoDebitoController.listarNotasDebito);
router.get('/estadisticas', autenticarJWT, motivoNotaCreditoDebitoController.obtenerEstadisticas);

// CRUD básico
router.get('/', autenticarJWT, motivoNotaCreditoDebitoController.listar);
router.get('/:id', autenticarJWT, motivoNotaCreditoDebitoController.obtenerPorId);
router.post('/', autenticarJWT, motivoNotaCreditoDebitoController.crear);
router.put('/:id', autenticarJWT, motivoNotaCreditoDebitoController.actualizar);
router.delete('/:id', autenticarJWT, motivoNotaCreditoDebitoController.eliminar);

export default router;