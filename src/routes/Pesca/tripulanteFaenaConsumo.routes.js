import { Router } from 'express';
import * as tripulanteFaenaConsumoController from '../../controllers/Pesca/tripulanteFaenaConsumo.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
const router = Router();

// Aplicar autenticación a todas las rutas
router.use(autenticarJWT);

// GET /api/pesca/tripulantes-faena-consumo - Listar todos
router.get('/', tripulanteFaenaConsumoController.listar);

// GET /api/pesca/tripulantes-faena-consumo/:id - Obtener por ID
router.get('/:id', tripulanteFaenaConsumoController.obtenerPorId);

// GET /api/pesca/tripulantes-faena-consumo/faena/:faenaPescaConsumoId - Obtener por faena
router.get('/faena/:faenaPescaConsumoId', tripulanteFaenaConsumoController.obtenerPorFaena);

// POST /api/pesca/tripulantes-faena-consumo - Crear
router.post('/', tripulanteFaenaConsumoController.crear);

// POST /api/pesca/tripulantes-faena-consumo/regenerar/:faenaPescaConsumoId - Regenerar tripulantes
router.post('/regenerar/:faenaPescaConsumoId', tripulanteFaenaConsumoController.regenerarTripulantes);

// PUT /api/pesca/tripulantes-faena-consumo/:id - Actualizar
router.put('/:id', tripulanteFaenaConsumoController.actualizar);

// DELETE /api/pesca/tripulantes-faena-consumo/:id - Eliminar
router.delete('/:id', tripulanteFaenaConsumoController.eliminar);

export default router;