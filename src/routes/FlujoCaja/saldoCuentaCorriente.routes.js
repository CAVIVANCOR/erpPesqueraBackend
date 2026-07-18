import express from 'express';
import saldoCuentaCorrienteController from '../../controllers/FlujoCaja/saldoCuentaCorriente.controller.js';

const router = express.Router();

// Rutas CRUD para SaldoCuentaCorriente
router.get('/', saldoCuentaCorrienteController.listar);
router.get('/historial', saldoCuentaCorrienteController.obtenerHistorial);
router.get('/saldo-actual', saldoCuentaCorrienteController.calcularSaldoActual);
router.get('/por-movimiento/:movimientoCajaId', saldoCuentaCorrienteController.listarPorMovimiento);
router.get('/:id', saldoCuentaCorrienteController.obtenerPorId);
router.post('/', saldoCuentaCorrienteController.crear);
router.put('/:id', saldoCuentaCorrienteController.actualizar);
router.delete('/:id', saldoCuentaCorrienteController.eliminar);

// Rutas para generación de asientos contables
router.get('/:id/generar-borrador-asiento', saldoCuentaCorrienteController.generarBorradorAsiento);
router.post('/:id/guardar-asiento', saldoCuentaCorrienteController.guardarAsientoContable);
router.delete('/:id/asiento/:asientoId', saldoCuentaCorrienteController.eliminarAsientoContable);
export default router;
