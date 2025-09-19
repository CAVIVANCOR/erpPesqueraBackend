import express from 'express';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import * as tripulanteFaenaController from '../../controllers/Pesca/tripulanteFaena.controller.js';

const router = express.Router();

/**
 * Rutas para TripulanteFaena
 * Solo permite consulta y actualización de observaciones
 * Los tripulantes se crean automáticamente al crear una faena
 */

// Aplicar autenticación a todas las rutas
router.use(autenticarJWT);

// GET /api/tripulantes-faena - Listar todos los tripulantes de faenas
router.get('/', tripulanteFaenaController.listar);

// GET /api/tripulantes-faena/:id - Obtener tripulante por ID
router.get('/:id', tripulanteFaenaController.obtenerPorId);

// GET /api/tripulantes-faena/faena/:faenaPescaId - Obtener tripulantes por faena
router.get('/faena/:faenaPescaId', tripulanteFaenaController.obtenerPorFaena);

// PUT /api/tripulantes-faena/:id - Actualizar tripulante (solo observaciones)
router.put('/:id', tripulanteFaenaController.actualizar);

export default router;
