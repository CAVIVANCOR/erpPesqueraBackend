import express from 'express';
import * as tipoPrestamoController from '../../controllers/Tesoreria/tipoPrestamo.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Rutas para TipoPrestamo
 * Todas las rutas requieren autenticación
 */

// Rutas específicas PRIMERO (antes de /:id)
router.get('/activos', autenticarJWT, tipoPrestamoController.listarActivos);
router.get('/comercio-exterior', autenticarJWT, tipoPrestamoController.listarComercioExterior);
router.get('/estadisticas', autenticarJWT, tipoPrestamoController.obtenerEstadisticas);

// CRUD básico
router.get('/', autenticarJWT, tipoPrestamoController.listar);
router.get('/:id', autenticarJWT, tipoPrestamoController.obtenerPorId);
router.post('/', autenticarJWT, tipoPrestamoController.crear);
router.put('/:id', autenticarJWT, tipoPrestamoController.actualizar);
router.delete('/:id', autenticarJWT, tipoPrestamoController.eliminar);

export default router;