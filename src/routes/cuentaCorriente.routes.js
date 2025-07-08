import express from 'express';
import cuentaCorrienteController from '../controllers/cuentaCorriente.controller.js';

const router = express.Router();

router.get('/', cuentaCorrienteController.listar);
router.get('/:id', cuentaCorrienteController.obtenerPorId);
router.post('/', cuentaCorrienteController.crear);
router.put('/:id', cuentaCorrienteController.actualizar);
router.delete('/:id', cuentaCorrienteController.eliminar);

export default router;
