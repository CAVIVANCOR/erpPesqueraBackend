import { Router } from 'express';
import * as cuotaPrestamoController from '../../controllers/Tesoreria/cuotaPrestamo.controller.js';

const router = Router();

// Rutas CRUD básicas
router.get('/', cuotaPrestamoController.listar);
router.get('/pendientes', cuotaPrestamoController.listarPendientes);
router.get('/vencidas', cuotaPrestamoController.listarVencidas);
router.get('/prestamo/:prestamoBancarioId', cuotaPrestamoController.listarPorPrestamo);
router.get('/:id', cuotaPrestamoController.obtenerPorId);
router.post('/', cuotaPrestamoController.crear);
router.post('/:id/pagar', cuotaPrestamoController.registrarPago);
router.post('/:id/marcar-saldo-inicial', cuotaPrestamoController.marcarComoSaldoInicial);
router.post('/actualizar-vencidos', cuotaPrestamoController.actualizarEstadosVencidos);
router.post('/generar-cronograma/:prestamoBancarioId', cuotaPrestamoController.generarCronograma);
router.post('/bulk/:prestamoBancarioId', cuotaPrestamoController.guardarBulk);
router.put('/:id', cuotaPrestamoController.actualizar);
router.delete('/:id', cuotaPrestamoController.eliminar);

export default router;