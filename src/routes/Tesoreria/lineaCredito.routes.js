import express from 'express';
import * as lineaCreditoController from '../../controllers/Tesoreria/lineaCredito.controller.js';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';

const router = express.Router();

/**
 * Rutas para LineaCredito
 * Todas las rutas requieren autenticación
 */

// Rutas específicas PRIMERO (antes de /:id)
router.get('/vigentes', autenticarJWT, lineaCreditoController.listarVigentes);
router.get('/empresa/:empresaId', autenticarJWT, lineaCreditoController.listarPorEmpresa);
router.get('/reporte/lineas-disponibles/:empresaId', autenticarJWT, lineaCreditoController.obtenerReporteLineasDisponibles);

// CRUD básico
router.get('/', autenticarJWT, lineaCreditoController.listar);
router.get('/:id', autenticarJWT, lineaCreditoController.obtenerPorId);
router.post('/', autenticarJWT, lineaCreditoController.crear);
router.put('/:id', autenticarJWT, lineaCreditoController.actualizar);
router.delete('/:id', autenticarJWT, lineaCreditoController.eliminar);

// Préstamos vinculados
router.get('/:id/prestamos', autenticarJWT, lineaCreditoController.listarPrestamos);

export default router;