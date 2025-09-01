import express from 'express';
import testRecalculoController from '../../controllers/Pesca/testRecalculo.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Rutas para probar y verificar los cálculos de toneladas
 * Todas las rutas están protegidas con autenticación JWT
 */

// GET /api/test-recalculo/verificar - Verificar cálculos completos
router.get('/verificar', autenticarJWT, testRecalculoController.verificarCalculos);

// GET /api/test-recalculo/muestra - Obtener muestra de datos
router.get('/muestra', autenticarJWT, testRecalculoController.obtenerMuestra);

// GET /api/test-recalculo/cala/:id - Verificar cala específica
router.get('/cala/:id', autenticarJWT, testRecalculoController.verificarCala);

// GET /api/test-recalculo/faena/:id - Verificar faena específica
router.get('/faena/:id', autenticarJWT, testRecalculoController.verificarFaena);

export default router;
