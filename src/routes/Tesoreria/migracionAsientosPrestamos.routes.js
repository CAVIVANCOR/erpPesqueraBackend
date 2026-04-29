import express from 'express';
import migracionAsientosPrestamosController from '../../controllers/Tesoreria/migracionAsientosPrestamos.controller.js';

const router = express.Router();

/**
 * @route GET /api/tesoreria/migracion-asientos-prestamos/sin-asientos
 * @desc Obtiene lista de préstamos sin asientos contables
 * @query empresaId (opcional)
 */
router.get('/sin-asientos', migracionAsientosPrestamosController.obtenerPrestamosSinAsientos);

/**
 * @route POST /api/tesoreria/migracion-asientos-prestamos/ejecutar
 * @desc Ejecuta la migración de asientos para préstamos
 * @body empresaId (opcional), creadoPor (opcional)
 */
router.post('/ejecutar', migracionAsientosPrestamosController.ejecutarMigracion);

export default router;
