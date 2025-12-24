import express from 'express';
import saldoCuentaCorrienteController from '../../controllers/FlujoCaja/saldoCuentaCorriente.controller.js';

const router = express.Router();

// Rutas CRUD para SaldoCuentaCorriente
router.get('/', saldoCuentaCorrienteController.listar);
router.get('/historial', saldoCuentaCorrienteController.obtenerHistorial);
router.get('/saldo-actual', saldoCuentaCorrienteController.calcularSaldoActual);
router.get('/:id', saldoCuentaCorrienteController.obtenerPorId);
router.post('/', saldoCuentaCorrienteController.crear);
router.put('/:id', saldoCuentaCorrienteController.actualizar);
router.delete('/:id', saldoCuentaCorrienteController.eliminar);

export default router;
