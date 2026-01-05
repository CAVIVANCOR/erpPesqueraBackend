import { Router } from 'express';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import * as garantiaPrestamoController from '../../controllers/Tesoreria/garantiaPrestamo.controller.js';

const router = Router();

// Rutas específicas PRIMERO (antes de /:id)
router.get('/activas', autenticarJWT, garantiaPrestamoController.listarActivas);
router.get('/prestamo/:prestamoBancarioId', autenticarJWT, garantiaPrestamoController.listarPorPrestamo);
router.post('/:id/liberar', autenticarJWT, garantiaPrestamoController.liberar);
router.post('/:id/reactivar', autenticarJWT, garantiaPrestamoController.reactivar);

// CRUD básico
router.get('/', autenticarJWT, garantiaPrestamoController.listar);
router.get('/:id', autenticarJWT, garantiaPrestamoController.obtenerPorId);
router.post('/', autenticarJWT, garantiaPrestamoController.crear);
router.put('/:id', autenticarJWT, garantiaPrestamoController.actualizar);
router.delete('/:id', autenticarJWT, garantiaPrestamoController.eliminar);

export default router;
