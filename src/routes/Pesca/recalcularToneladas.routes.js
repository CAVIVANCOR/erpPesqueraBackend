import express from 'express';
import recalcularToneladasController from '../../controllers/Pesca/recalcularToneladas.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Rutas para recalcular toneladas por registro específico
 * Todas las rutas están protegidas con autenticación JWT
 */

// Aplicar middleware de autenticación a todas las rutas
router.use(autenticarJWT);

// POST /api/recalcular-toneladas/cala/:id - Recalcular cala específica
router.post('/cala/:id', recalcularToneladasController.recalcularCala);

// POST /api/recalcular-toneladas/faena/:id - Recalcular faena específica
router.post('/faena/:id', recalcularToneladasController.recalcularFaena);

// POST /api/recalcular-toneladas/temporada/:id - Recalcular temporada específica
router.post('/temporada/:id', recalcularToneladasController.recalcularTemporada);

// POST /api/recalcular-toneladas/cascada-cala/:id - Recalcular en cascada desde cala
router.post('/cascada-cala/:id', recalcularToneladasController.recalcularCascadaCala);

// POST /api/recalcular-toneladas/cascada-faena/:id - Recalcular en cascada desde faena
router.post('/cascada-faena/:id', recalcularToneladasController.recalcularCascadaFaena);

export default router;
