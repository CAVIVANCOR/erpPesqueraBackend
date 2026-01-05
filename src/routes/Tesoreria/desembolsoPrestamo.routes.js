import { Router } from 'express';
import { autenticarJWT } from '../../middlewares/authMiddleware.js';
import * as desembolsoPrestamoController from '../../controllers/Tesoreria/desembolsoPrestamo.controller.js';

const router = Router();

// Rutas específicas PRIMERO (antes de /:id)
router.get('/prestamo/:prestamoBancarioId', autenticarJWT, desembolsoPrestamoController.listarPorPrestamo);
router.get('/prestamo/:prestamoBancarioId/total', autenticarJWT, desembolsoPrestamoController.obtenerTotalDesembolsado);

// CRUD básico
router.get('/', autenticarJWT, desembolsoPrestamoController.listar);
router.get('/:id', autenticarJWT, desembolsoPrestamoController.obtenerPorId);
router.post('/', autenticarJWT, desembolsoPrestamoController.crear);
router.put('/:id', autenticarJWT, desembolsoPrestamoController.actualizar);
router.delete('/:id', autenticarJWT, desembolsoPrestamoController.eliminar);

export default router;
