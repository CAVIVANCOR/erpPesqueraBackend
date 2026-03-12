import { Router } from 'express';
import * as comisionFidelizacionController from '../../controllers/Pesca/comisionFidelizacion.controller.js';

const router = Router();

/**
 * Rutas para Comisiones de Fidelización
 * Base: /api/pesca/comisiones-fidelizacion
 */

// POST /api/pesca/comisiones-fidelizacion/generar/:temporadaId
// Generar comisiones de fidelización para una temporada
router.post('/generar/:temporadaId', comisionFidelizacionController.generarComisiones);

// GET /api/pesca/comisiones-fidelizacion/temporada/:temporadaId
// Obtener comisiones generadas de una temporada
router.get('/temporada/:temporadaId', comisionFidelizacionController.obtenerComisionesPorTemporada);

export default router;