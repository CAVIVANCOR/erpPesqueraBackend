import { Router } from 'express';
import * as geolocalizacionController from '../../controllers/Pesca/geolocalizacion.controller.js';

const router = Router();

/**
 * Rutas para análisis de geolocalización
 * POST /api/pesca/geolocalizacion/analizar - Analiza coordenadas GPS
 */
router.post('/analizar', geolocalizacionController.analizarCoordenadas);
router.post('/referencia-costa', geolocalizacionController.obtenerReferenciaCosta);

export default router;
