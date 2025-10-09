import express from 'express';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import * as tripulanteFaenaController from '../../controllers/Pesca/tripulanteFaena.controller.js';

const router = express.Router();

/**
 * Rutas para TripulanteFaena
 * Permite consulta, creación y actualización de tripulantes
 * Los tripulantes se crean automáticamente al crear una faena o manualmente
 */

// Aplicar autenticación a todas las rutas
router.use(autenticarJWT);

// GET /api/pesca/tripulantes-faena - Listar todos los tripulantes de faenas
router.get('/', tripulanteFaenaController.listar);

// GET /api/pesca/tripulantes-faena/:id - Obtener tripulante por ID
router.get('/:id', tripulanteFaenaController.obtenerPorId);

// GET /api/pesca/tripulantes-faena/faena/:faenaPescaId - Obtener tripulantes por faena
router.get('/faena/:faenaPescaId', tripulanteFaenaController.obtenerPorFaena);

// POST /api/pesca/tripulantes-faena - Crear tripulante manualmente
router.post('/', tripulanteFaenaController.crear);

// PUT /api/pesca/tripulantes-faena/:id - Actualizar tripulante (solo observaciones)
router.put('/:id', tripulanteFaenaController.actualizar);

export default router;